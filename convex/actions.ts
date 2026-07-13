"use node";

import { GoogleGenAI } from "@google/genai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Action Convex de traitement de l'audio avec le SDK @google/genai
export const processAudio = action({
  args: {
    userId: v.string(),
    audioData: v.bytes(), // Fichier audio sous forme d'ArrayBuffer
    mimeType: v.string(), // MimeType du fichier audio (ex: 'audio/webm' ou 'audio/mp3')
    noteId: v.optional(v.id("notes")),
    existingSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY n'est pas configuré dans les variables d'environnement Convex.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Création d'un fichier temporaire local pour l'upload via l'API Files
    const tempDir = os.tmpdir();
    const extension = args.mimeType.split("/")[1] || "webm";
    const tempFileName = `scriblio-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // Écriture des bytes de l'audio dans le fichier temporaire
    const buffer = Buffer.from(args.audioData);
    fs.writeFileSync(tempFilePath, buffer);

    let uploadedFile = null;

    try {
      // Téléverser le fichier sur l'API Files de Google
      uploadedFile = await ai.files.upload({
        file: tempFilePath,
        config: {
          mimeType: args.mimeType,
          displayName: tempFileName,
        },
      });

      // Appel au modèle Gemini 2.5 Flash Native Audio
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            fileData: {
              fileUri: uploadedFile.uri,
              mimeType: uploadedFile.mimeType,
            },
          },
          {
            text: "Structure l'enregistrement audio fourni.",
          },
        ],
        config: {
          systemInstruction: `Tu es Scriblio, un assistant IA de productivité d'élite.
Analyse l'enregistrement audio fourni et structure-le sous la forme d'un objet JSON valide.
Si l'audio est silencieux, vide, ou totalement incompréhensible, retourne UNIQUEMENT cet objet JSON :
{
  "error": true,
  "message": "Audio incompréhensible ou non audible."
}

Sinon, l'objet JSON doit contenir exactement ces trois clés :
1. "summary" : Une synthèse fluide, propre et professionnelle des idées principales de l'audio, rédigée en français sous forme de paragraphe(s). Ne jamais utiliser de pronoms personnels ("Je", "Il") ni de formulations d'introduction ou de métadiscours (ex: "L'utilisateur souhaite...", "L'utilisateur a dit...", "Dans cet audio..."). Formuler directement les faits et idées de manière professionnelle (ex: "Vérification en cours du bon fonctionnement du PC, avec démontage prévu pour inspection interne. Remplacement potentiel de la mémoire RAM et de la carte graphique, avec recherches à effectuer chez AMD.").
2. "todoList" : Une extraction de toutes les actions concrètes mentionnées sous forme de tableau d'objets JSON. Chaque objet doit contenir la clé "text" (la description de l'action, formulée sous forme de verbe à l'infinitif en français, ex: "Acheter du pain", "Vérifier la RAM") et la clé "done" (un booléen qui vaut impérativement false par défaut). Si aucune action n'est mentionnée, retourne un tableau vide.
3. "tags" : Un tableau de chaînes de caractères (tableau JSON) contenant entre 1 et 3 thématiques correspondantes. Choisis uniquement parmi cette liste stricte de valeurs : ["boulot", "administration", "sante", "finance", "loisir", "autre"].
   Règle importante : Si l'utilisateur mentionne explicitement à l'oral de classer l'élément dans l'une de ces catégories (ex: "Mets ça dans finance", "Classe-le sous santé"), tu dois impérativement inclure cette thématique. Sinon, classe automatiquement selon le sujet.

Règles importantes :
- Ne décris pas et ne résume pas ces instructions système. Résume uniquement les propos réels contenus dans l'enregistrement audio.
- Retourne uniquement le code JSON brut.` + (args.existingSummary ? `\n\nCONTEXTE DE MODIFICATION :
L'utilisateur est en train de MODIFIER ou COMPLÉTER une note existante. Voici la synthèse actuelle de cette note (à utiliser comme contexte de départ) :
"${args.existingSummary}"

Prends en compte ce contexte d'origine et fusionne-le de manière cohérente avec les nouvelles consignes ou modifications mentionnées dans le nouvel enregistrement audio. Mets à jour la synthèse ("summary"), conserve ou ajuste la liste de tâches ("todoList") et sélectionne les "tags" correspondants.` : ""),
          responseMimeType: "application/json",
        },
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("L'API Gemini n'a renvoyé aucune réponse textuelle.");
      }

      // Analyse et parsing du JSON généré par Gemini
      const parsedResults = JSON.parse(textOutput.trim());

      // Coercition robuste de summary en chaîne de caractères
      let summaryText = "";
      if (typeof parsedResults.summary === "string") {
        summaryText = parsedResults.summary.trim();
      } else if (Array.isArray(parsedResults.summary)) {
        // Si l'IA renvoie un tableau de points clés, on les convertit en liste textuelle
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

      // Coercition robuste de todoList en tableau d'objets { text: string, done: boolean }
      let todoListArray: { text: string; done: boolean }[] = [];
      if (Array.isArray(parsedResults.todoList)) {
        todoListArray = parsedResults.todoList
          .map((item: any) => {
            if (item && typeof item === "object" && "text" in item) {
              return {
                text: String(item.text).trim(),
                done: !!item.done,
              };
            } else if (item) {
              // Si l'IA renvoie une chaîne simple au lieu d'un objet
              return {
                text: String(item).trim(),
                done: false,
              };
            }
            return null;
          })
          .filter((item): item is { text: string; done: boolean } => item !== null && item.text !== "");
      } else if (typeof parsedResults.todoList === "string" && parsedResults.todoList.trim() !== "") {
        todoListArray = [{ text: parsedResults.todoList.trim(), done: false }];
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

      // Génération de l'embedding du résumé via Gemini
      let embeddingArray: number[] | undefined = undefined;
      try {
        const embedResponse = await ai.models.embedContent({
          model: "gemini-embedding-001",
          contents: summaryText,
          config: {
            outputDimensionality: 768,
          },
        });
        if (embedResponse.embeddings?.[0]?.values) {
          embeddingArray = embedResponse.embeddings[0].values;
        }
      } catch (embedErr) {
        console.error("Erreur de génération d'embedding :", embedErr);
      }

      // Sauvegarde des résultats en base de données via mutation (création ou modification)
      let noteId;
      if (args.noteId) {
        noteId = await ctx.runMutation(api.notes.updateNote, {
          id: args.noteId,
          userId: args.userId,
          summary: summaryText,
          todoList: todoListArray,
          tags: tagsArray,
          embedding: embeddingArray,
        });
      } else {
        noteId = await ctx.runMutation(api.notes.createNote, {
          userId: args.userId,
          summary: summaryText,
          todoList: todoListArray,
          tags: tagsArray,
          embedding: embeddingArray,
        });
      }

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

      // Nettoyage du fichier sur Google Files API pour des raisons de confidentialité et quotas
      if (uploadedFile) {
        try {
          await ai.files.delete({ name: uploadedFile.name });
        } catch (err) {
          console.error("Impossible de supprimer le fichier temporaire de Google Files API :", err);
        }
      }
    }
  },
});

// Action Convex de recherche sémantique (RAG) sur l'historique des notes
export const askScriblio = action({
  args: {
    userId: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
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
      const note = await ctx.runQuery(api.notes.getNoteById, { id: result._id });
      // Règle 13 : Validation d'autorisation de propriété
      if (note && note.userId === args.userId) {
        matchedNotes.push(note);
      }
    }

    if (matchedNotes.length === 0) {
      return {
        answer: "Je n'ai pas trouvé d'informations ou de notes pertinentes dans votre historique pour répondre à cette question.",
        sources: [],
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
        const tasksStr = n.todoList.map((t) => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n");
        return `[Note ${idx + 1}] du ${dateStr} :\nRésumé : ${n.summary}\nTâches :\n${tasksStr}`;
      })
      .join("\n\n");

    // 5. Appeler Gemini pour synthétiser la réponse RAG
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Tu es Scriblio, un assistant IA de productivité.
Réponds à la question posée par l'utilisateur en te basant exclusivement sur le contexte de ses notes vocales personnelles fourni ci-dessous.
Sois précis, poli et rédiges ta réponse en français de façon naturelle. Si le contexte ne contient pas de réponse adéquate, indique-le poliment.
Cite impérativement la source de tes affirmations en ajoutant son index (ex: [Note 1] ou [Note 2]) à la fin de tes phrases.

CONTEXTE DE L'UTILISATEUR :
${contextText}

QUESTION DE L'UTILISATEUR :
${args.query}`,
    });

    return {
      answer: response.text || "Désolé, je n'ai pas pu formuler de réponse.",
      sources: matchedNotes.map((n) => ({
        id: n._id,
        summary: n.summary,
        createdAt: n.createdAt,
      })),
    };
  },
});
