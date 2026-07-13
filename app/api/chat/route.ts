import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function generateStreamWithRetry(
  ai: GoogleGenAI,
  models: string[],
  contents: string
) {
  let lastError = null;
  for (const model of models) {
    try {
      console.log(`[API Streaming] Tentative d'initialisation du stream avec ${model}`);
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
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
  throw lastError || new Error("Impossible de démarrer le flux de génération.");
}

export async function POST(req: Request) {
  try {
    const { userId, query } = await req.json();

    if (!userId || !query) {
      return NextResponse.json({ error: "userId et query sont requis" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "La variable d'environnement GEMINI_API_KEY n'est pas configurée côté Next.js (.env.local)." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. Recherche RAG des notes sur Convex
    const { matchedNotes } = await convex.action(api.actions.searchNotesForRAG, {
      userId,
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
        const tasksStr = n.todoList.map((t: any) => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n");
        return `[Note ${idx + 1}] du ${dateStr} :\nRésumé : ${n.summary}\nTâches :\n${tasksStr}`;
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
Cite impérativement la source de tes affirmations en ajoutant son index (ex: [Note 1] ou [Note 2]) à la fin de tes phrases.
Ne commence jamais ta réponse par des salutations (ex: "Bonjour", "Salut", "Hello") ni par des formules de politesse d'introduction. Rédige directement la réponse.

DATE D'AUJOURD'HUI : ${currentDateStr}

RÈGLE TEMPORELLE CRITIQUE :
Fais extrêmement attention aux dates. Compare la date d'aujourd'hui avec la date de création de chaque note. Si l'utilisateur pose une question temporelle (ex: "ce samedi", "cette semaine", "le mois dernier"), filtre mentalement les notes pour ne garder que celles correspondant précisément à la période ciblée. Ignore les tâches ou événements prévus pour d'autres semaines ou dates.

CONTEXTE DE L'UTILISATEUR :
${contextText}

QUESTION DE L'UTILISATEUR :
${query}`;

    // 3. Obtenir le stream avec fallback
    const models = ["gemma-4-26b-a4b-it", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-1.5-flash"];
    const responseStream = await generateStreamWithRetry(ai, models, systemPrompt);

    // 4. Définir le ReadableStream pour Next.js Response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Envoyer d'abord les sources sous forme d'une ligne spéciale préfixée
          const sourcesHeader = {
            sources: matchedNotes.map((n: any) => ({
              id: n._id,
              summary: n.summary,
              createdAt: n.createdAt,
            })),
          };
          controller.enqueue(encoder.encode(`__SOURCES__:${JSON.stringify(sourcesHeader)}\n`));

          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
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
