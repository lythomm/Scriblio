import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export const dynamic = "force-dynamic";

async function generateStreamWithRetry(
  groq: Groq,
  models: string[],
  contents: string
) {
  let lastError = null;
  for (const model of models) {
    try {
      console.log(`[API Streaming] Tentative d'initialisation du stream Groq avec ${model}`);
      const responseStream = await groq.chat.completions.create({
        model,
        messages: [
          { role: "user", content: contents }
        ],
        stream: true,
      });
      return responseStream;
    } catch (err: any) {
      lastError = err;
      console.warn(`[API Streaming] Échec initialisation stream avec ${model}:`, err.message || err);
      const errStr = String(err);
      if (errStr.includes("400") || errStr.includes("403") || errStr.includes("404")) {
        continue;
      }
    }
  }
  throw lastError || new Error("Impossible de démarrer le flux de génération Groq.");
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "query est requis" }, { status: 400 });
    }

    const token = await convexAuthNextjsToken();
    if (!token) {
      return NextResponse.json({ error: "Non autorisé. Utilisateur non connecté." }, { status: 401 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "La variable d'environnement GROQ_API_KEY n'est pas configurée côté Next.js (.env.local)." },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    // Instanciation à chaque requête pour éviter les conditions de concurrence sur l'authentification
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
      auth: token,
    });

    // 1. Recherche RAG des notes sur Convex
    const { matchedNotes } = await convex.action(api.actions.searchNotesForRAG, {
      query,
    });


    if (!matchedNotes || matchedNotes.length === 0) {
      return new Response(
        JSON.stringify({
          answer: "Je n'ai pas trouvé d'informations ou de notes pertinentes dans votre historique pour répondre à cette question.",
          sources: [],
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Formater le contexte
    const contextText = matchedNotes
      .map((n: any, idx: number) => {
        const dateStr = new Date(n.createdAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `[Note ${idx + 1}] du ${dateStr} :\nRésumé : ${n.summary}`;
      })
      .join("\n\n");

    const now = new Date();
    const currentDateStr = now.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const systemPrompt = `Tu es Scriblio, un assistant IA de productivité.
Réponds à la question posée par l'utilisateur en te basant exclusivement sur le contexte de ses notes vocales personnelles fourni ci-dessous.
Sois précis, poli et rédiges ta réponse en français de façon naturelle. Si le contexte ne contient pas de réponse adéquate, indique-le poliment.
Ne commence jamais ta réponse par des salutations (ex: "Bonjour", "Salut", "Hello") ni par des formules de politesse d'introduction. Rédige directement la réponse.

DATE D'AUJOURD'HUI : ${currentDateStr}

RÈGLE TEMPORELLE CRITIQUE :
Fais extrêmement attention aux dates. Compare la date d'aujourd'hui avec la date de création de chaque note. Si l'utilisateur pose une question temporelle (ex: "ce samedi", "cette semaine", "le mois dernier"), filtre mentalement les notes pour ne garder que celles correspondant précisément à la période ciblée. Ignore les tâches ou événements prévus pour d'autres semaines ou dates.

CONTEXTE DE L'UTILISATEUR :
${contextText}

QUESTION DE L'UTILISATEUR :
${query}`;

    // 3. Obtenir le stream avec fallback
    const models = ["llama-3.1-8b-instant", "meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.3-70b-versatile"];
    const responseStream = await generateStreamWithRetry(groq, models, systemPrompt);

    // 4. Définir le ReadableStream pour Next.js Response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {


          for await (const chunk of responseStream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[API Chat Error]:", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
