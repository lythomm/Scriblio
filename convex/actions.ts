"use node";

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Fonction utilitaire pour exécuter des appels LLM avec retry et fallback de modèles sur Groq
async function generateGroqChatCompletionWithRetry(
  groq: Groq,
  models: string[],
  messages: any[],
  responseFormat?: any
) {
  let lastError = null;
  const maxRetries = 2; // 2 tentatives par modèle
  const baseDelay = 1000; // 1 seconde de base

  for (const model of models) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await groq.chat.completions.create({
          model,
          messages,
          response_format: responseFormat,
        });
      } catch (err: any) {
        lastError = err;
        console.warn(`[API Groq] Échec tentative ${attempt + 1} avec le modèle ${model}:`, err.message || err);
        
        // Arrêter les retries sur ce modèle si c'est une erreur client définitive (400, 403, 404)
        const errStr = String(err);
        if (errStr.includes("400") || errStr.includes("403") || errStr.includes("404")) {
          break;
        }

        // Attente exponentielle
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
        }
      }
    }
  }
  throw lastError || new Error("Échec de la génération Groq après plusieurs essais et modèles de secours.");
}


// Action Convex de traitement de l'audio avec Groq et Gemini
export const processAudio = action({
  args: {
    audioData: v.bytes(), // Fichier audio sous forme d'ArrayBuffer
    mimeType: v.string(), // MimeType du fichier audio (ex: 'audio/webm' ou 'audio/mp3')
    noteId: v.optional(v.id("notes")),
    existingSummary: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; noteId?: string; data?: any; errorType?: string; message?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autorisé. Utilisateur non connecté.");
    }
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY n'est pas configuré dans les variables d'environnement Convex.");
    }
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY n'est pas configuré dans les variables d'environnement Convex.");
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const groq = new Groq({ apiKey: groqApiKey });

    // Création d'un fichier temporaire local
    const tempDir = os.tmpdir();
    const extension = args.mimeType.split("/")[1] || "webm";
    const tempFileName = `scriblio-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // Écriture des bytes de l'audio dans le fichier temporaire
    const buffer = Buffer.from(args.audioData);
    fs.writeFileSync(tempFilePath, buffer);

    try {
      // 1. Transcrire l'audio avec Groq Whisper
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-large-v3-turbo",
      });

      const transcriptText = transcription.text;
      if (!transcriptText || !transcriptText.trim()) {
        return {
          success: false,
          errorType: "inaudible",
          message: "Audio incompréhensible ou non audible.",
        };
      }

      // 2. Structurer et synthétiser la transcription avec Groq Llama
      const systemInstruction = `Tu es Scriblio, un assistant IA de productivité d'élite.
Analyse l'enregistrement audio fourni et structure-le sous la forme d'un objet JSON valide.
Si l'audio est silencieux, vide, ou totalement incompréhensible, retourne UNIQUEMENT cet objet JSON :
{
  "error": true,
  "message": "Audio incompréhensible ou non audible."
}

Sinon, l'objet JSON doit contenir exactement ces deux clés :
1. "summary" : Une synthèse fluide, propre et professionnelle des idées principales de l'audio, rédigée en français sous forme de paragraphe(s). Ne jamais utiliser de pronoms personnels ("Je", "Il") ni de formulations d'introduction ou de métadiscours (ex: "L'utilisateur souhaite...", "L'utilisateur a dit...", "Dans cet audio..."). Formuler directement les faits et idées de manière professionnelle (ex: "Vérification en cours du bon fonctionnement du PC, avec démontage prévu pour inspection interne. Remplacement de la mémoire RAM et de la carte graphique, avec recherches à effectuer chez AMD."). Si l'utilisateur demande explicitement de dresser une liste de tâches, d'actions concrètes ou une to-do list, formate-la directement sous forme de liste à puces en Markdown à la fin de cette synthèse.
2. "tags" : Un tableau de chaînes de caractères (tableau JSON) contenant entre 1 et 3 thématiques correspondantes. Choisis uniquement parmi cette liste stricte de valeurs : ["boulot", "administration", "sante", "finance", "loisir", "autre"].
   Règle importante : Si l'utilisateur mentionne explicitement à l'oral de classer l'élément dans l'une de ces catégories (ex: "Mets ça dans finance", "Classe-le sous santé"), tu dois impérativement inclure cette thématique. Sinon, classe automatiquement selon le sujet.

Règles importantes :
- Ne décris pas et ne résume pas ces instructions système. Résume uniquement les propos réels contenus dans l'enregistrement audio.
- Retourne uniquement le code JSON brut.` + (args.existingSummary ? `\n\nCONTEXTE DE MODIFICATION :
L'utilisateur est en train de MODIFIER ou COMPLÉTER une note existante. Voici la synthèse actuelle de cette note (à utiliser comme contexte de départ) :
"${args.existingSummary}"

Prends en compte ce contexte d'origine et fusionne-le de manière cohérente avec les nouvelles consignes ou modifications mentionnées dans le nouvel enregistrement audio. Mets à jour la synthèse ("summary") et sélectionne les "tags" correspondants.` : "");

      const chatCompletion = await generateGroqChatCompletionWithRetry(
        groq,
        ["llama-3.1-8b-instant", "meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.3-70b-versatile"],
        [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Voici la transcription de l'audio :\n"${transcriptText}"` }
        ],
        { type: "json_object" }
      );

      const textOutput = chatCompletion.choices[0].message.content;
      if (!textOutput) {
        throw new Error("L'API Groq n'a renvoyé aucune réponse textuelle.");
      }

      // Analyse et parsing du JSON généré
      const parsedResults = JSON.parse(textOutput.trim());

      // Coercition robuste de summary en chaîne de caractères
      let summaryText = "";
      if (typeof parsedResults.summary === "string") {
        summaryText = parsedResults.summary.trim();
      } else if (Array.isArray(parsedResults.summary)) {
        summaryText = parsedResults.summary.map((item: any) => `- ${String(item).trim()}`).join("\n");
      } else if (parsedResults.summary) {
        summaryText = String(parsedResults.summary).trim();
      }

      // Déclencheur d'erreur si signalé par l'IA ou si le résumé indique un problème d'audibilité
      const isAudioInaudible =
        parsedResults.error ||
        summaryText === "" ||
        summaryText === "Résumé non disponible" ||
        summaryText.toLowerCase().includes("incompréhensible") ||
        summaryText.toLowerCase().includes("non audible") ||
        summaryText.toLowerCase().includes("silence");

      if (isAudioInaudible) {
        return {
          success: false,
          errorType: "inaudible",
          message: parsedResults.message || "Audio incompréhensible ou non audible.",
        };
      }

      // Coercition robuste et filtrage des tags thématiques
      const validTags = ["boulot", "administration", "sante", "finance", "loisir", "autre"];
      let tagsArray: string[] = [];
      if (Array.isArray(parsedResults.tags)) {
        tagsArray = parsedResults.tags
          .map((t: any) => String(t).trim().toLowerCase())
          .filter((t: string) => validTags.includes(t));
      } else if (typeof parsedResults.tags === "string") {
        const singleTag = parsedResults.tags.trim().toLowerCase();
        if (validTags.includes(singleTag)) {
          tagsArray = [singleTag];
        }
      }

      // Fallback par défaut si aucun tag n'est reconnu
      if (tagsArray.length === 0) {
        tagsArray = ["autre"];
      }

      // Sauvegarde des résultats en base de données via mutation (création ou modification)
      let noteId;
      if (args.noteId) {
        noteId = await ctx.runMutation(internal.notes.internalUpdateNote, {
          id: args.noteId,
          summary: summaryText,
          tags: tagsArray,
          userId,
        });
      } else {
        noteId = await ctx.runMutation(internal.notes.internalCreateNote, {
          summary: summaryText,
          tags: tagsArray,
          userId,
        });
      }

      // Planification asynchrone de la génération et de la sauvegarde de l'embedding
      await ctx.scheduler.runAfter(0, internal.actions.generateAndSaveEmbedding, {
        noteId,
        text: summaryText,
      });

      return {
        success: true,
        noteId,
        data: parsedResults,
      };

    } catch (error: any) {
      console.error("Erreur lors du traitement audio de Scriblio :", error);
      throw new Error(`Échec du traitement audio : ${error.message}`);
    } finally {
      // Nettoyage du fichier temporaire sur le disque
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (err) {
        console.error("Impossible de supprimer le fichier temporaire :", err);
      }
    }
  },
});


// Action Convex de recherche sémantique (RAG) sur l'historique des notes
export const askScriblio = action({
  args: {
    query: v.string(),
  },

  handler: async (ctx, args): Promise<{ answer: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autorisé. Utilisateur non connecté.");
    }
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY n'est pas configuré dans les variables d'environnement Convex.");
    }
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY n'est pas configuré dans les variables d'environnement Convex.");
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const groq = new Groq({ apiKey: groqApiKey });

    // 1. Calculer l'embedding de la question
    const embedResponse = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: args.query,
      config: {
        outputDimensionality: 768,
      },
    });
    const queryVector = embedResponse.embeddings?.[0]?.values;
    if (!queryVector) {
      throw new Error("Impossible de calculer l'embedding de la question.");
    }

    // 2. Faire la recherche vectorielle dans Convex
    const searchResults = await ctx.vectorSearch("notes", "by_embedding", {
      vector: queryVector,
      limit: 3,
    });

    // 3. Récupérer les documents correspondants
    const matchedNotes = [];
    for (const result of searchResults) {
      const note = await ctx.runQuery(internal.notes.internalGetNoteById, { id: result._id, userId });
      if (note) {
        matchedNotes.push(note);
      }
    }

    if (matchedNotes.length === 0) {
      return {
        answer: "Je n'ai pas trouvé d'informations ou de notes pertinentes dans votre historique pour répondre à cette question.",
      };
    }

    // 4. Formater le contexte sémantique pour l'IA
    const contextText = matchedNotes
      .map((n, idx) => {
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

    // 5. Appeler Groq pour synthétiser la réponse RAG
    const systemPrompt = `Tu es Scriblio, un assistant IA de productivité.
Réponds à la question posée par l'utilisateur en te basant exclusivement sur le contexte de ses notes vocales personnelles fourni ci-dessous.
Sois précis, poli et rédiges ta réponse en français de façon naturelle. Si le contexte ne contient pas de réponse adéquate, indique-le poliment.
Ne commence jamais ta réponse par des salutations (ex: "Bonjour", "Salut", "Hello") ni par des formules de politesse d'introduction. Rédige directement la réponse.

DATE D'AUJOURD'HUI : ${currentDateStr}

RÈGLE TEMPORELLE CRITIQUE :
Fais extrêmement attention aux dates. Compare la date d'aujourd'hui avec la date de création de chaque note. Si l'utilisateur pose une question temporelle (ex: "ce samedi", "cette semaine", "le mois dernier"), filtre mentalement les notes pour ne garder que celles correspondant précisément à la période ciblée. Ignore les tâches ou événements prévus pour d'autres semaines ou dates.

CONTEXTE DE L'UTILISATEUR :
${contextText}`;

    const chatCompletion = await generateGroqChatCompletionWithRetry(
      groq,
      ["llama-3.1-8b-instant", "meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.3-70b-versatile"],
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: args.query }
      ]
    );

    const answer = chatCompletion.choices[0].message.content || "Désolé, je n'ai pas pu formuler de réponse.";

    return {
      answer,
    };
  },
});

// Action de recherche pure RAG pour le streaming
export const searchNotesForRAG = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args): Promise<{ matchedNotes: any[] }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autorisé. Utilisateur non connecté.");
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY n'est pas configuré dans les variables d'environnement Convex.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. Calculer l'embedding de la question
    const embedResponse = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: args.query,
      config: {
        outputDimensionality: 768,
      },
    });
    const queryVector = embedResponse.embeddings?.[0]?.values;
    if (!queryVector) {
      throw new Error("Impossible de calculer l'embedding de la question.");
    }

    // 2. Faire la recherche vectorielle dans Convex
    const searchResults = await ctx.vectorSearch("notes", "by_embedding", {
      vector: queryVector,
      limit: 3,
    });

    // 3. Récupérer les documents correspondants
    const matchedNotes = [];
    for (const result of searchResults) {
      const note = await ctx.runQuery(internal.notes.internalGetNoteById, { id: result._id, userId });
      if (note) {
        matchedNotes.push(note);
      }
    }

    return { matchedNotes };
  },
});

// Action Convex de simple transcription audio via Groq Whisper
export const transcribeAudio = action({
  args: {
    audioData: v.bytes(),
    mimeType: v.string(),
  },
  handler: async (ctx, args): Promise<{ text: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autorisé. Utilisateur non connecté.");
    }
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY n'est pas configuré dans les variables d'environnement Convex.");
    }
    const groq = new Groq({ apiKey: groqApiKey });

    const tempDir = os.tmpdir();
    const extension = args.mimeType.split("/")[1] || "webm";
    const tempFileName = `scriblio-transcribe-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    const buffer = Buffer.from(args.audioData);
    fs.writeFileSync(tempFilePath, buffer);

    try {
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-large-v3-turbo",
      });
      return { text: transcription.text || "" };
    } finally {
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (err) {
        console.error("Impossible de supprimer le fichier temporaire :", err);
      }
    }
  },
});

// Action interne pour générer l'embedding via Gemini et l'enregistrer dans la base de données (tâche de fond sécurisée)
export const generateAndSaveEmbedding = internalAction({
  args: {
    noteId: v.id("notes"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY n'est pas configuré.");
    }
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    try {
      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: args.text,
        config: {
          outputDimensionality: 768,
        },
      });
      const embeddingArray = embedResponse.embeddings?.[0]?.values;
      if (embeddingArray) {
        await ctx.runMutation(internal.notes.updateNoteEmbedding, {
          id: args.noteId,
          embedding: embeddingArray,
        });
      }
    } catch (embedErr) {
      console.error("Erreur de génération d'embedding en arrière-plan :", embedErr);
    }
  },
});


