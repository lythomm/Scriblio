import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Mutation pour insérer la note structurée dans la base de données
export const createNote = mutation({
  args: {
    summary: v.string(),
    tags: v.array(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autorisé. Utilisateur non connecté.");
    }

    const noteId = await ctx.db.insert("notes", {
      userId,
      summary: args.summary,
      tags: args.tags,
      audioStorageId: args.audioStorageId,
      createdAt: Date.now(),
      embedding: args.embedding,
    });
    return noteId;
  },
});

// Requête pour récupérer les notes d'un utilisateur
export const getNotes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Mutation pour supprimer une note
export const deleteNote = mutation({
  args: {
    id: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autorisé.");
    }

    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Note non trouvée.");
    }
    
    // Règle 13 : Validation d'autorisation de propriété
    if (note.userId !== userId) {
      throw new Error("Action non autorisée.");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Mutation pour mettre à jour le contenu d'une note existante
export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    summary: v.string(),
    tags: v.array(v.string()),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non autorisé.");
    }

    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Note non trouvée.");
    }
    
    // Règle 13 : Validation de propriété
    if (note.userId !== userId) {
      throw new Error("Action non autorisée.");
    }

    await ctx.db.patch(args.id, {
      summary: args.summary,
      tags: args.tags,
      embedding: args.embedding,
    });
    return args.id;
  },
});

// Requête pour récupérer une note par son identifiant
export const getNoteById = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const note = await ctx.db.get(args.id);
    if (!note) return null;

    // Règle 13 : Validation de propriété
    if (note.userId !== userId) return null;

    return note;
  },
});

// Mutation interne pour mettre à jour l'embedding d'une note (tâche de fond sécurisée)
export const updateNoteEmbedding = internalMutation({
  args: {
    id: v.id("notes"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Note non trouvée.");
    }
    await ctx.db.patch(args.id, {
      embedding: args.embedding,
    });
    return args.id;
  },
});


// Mutations et Requêtes Internes pour les appels depuis les Actions (contexte d'auth non transmis par défaut)
export const internalCreateNote = internalMutation({
  args: {
    summary: v.string(),
    tags: v.array(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    embedding: v.optional(v.array(v.float64())),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("notes", {
      userId: args.userId,
      summary: args.summary,
      tags: args.tags,
      audioStorageId: args.audioStorageId,
      createdAt: Date.now(),
      embedding: args.embedding,
    });
    return noteId;
  },
});

export const internalUpdateNote = internalMutation({
  args: {
    id: v.id("notes"),
    summary: v.string(),
    tags: v.array(v.string()),
    embedding: v.optional(v.array(v.float64())),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Note non trouvée.");
    }
    
    // Règle 13 : Validation d'autorisation de propriété
    if (note.userId !== args.userId) {
      throw new Error("Action non autorisée.");
    }

    await ctx.db.patch(args.id, {
      summary: args.summary,
      tags: args.tags,
      embedding: args.embedding,
    });
    return args.id;
  },
});

export const internalGetNoteById = internalQuery({
  args: { id: v.id("notes"), userId: v.string() },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) return null;

    // Règle 13 : Validation de propriété
    if (note.userId !== args.userId) return null;

    return note;
  },
});
