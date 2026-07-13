import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Mutation pour insérer la note structurée dans la base de données
export const createNote = mutation({
  args: {
    userId: v.string(),
    summary: v.string(),
    todoList: v.array(v.object({ text: v.string(), done: v.boolean() })),
    tags: v.array(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    // Règle 13 : Validation d'identité basique pour l'MVP.
    if (!args.userId) {
      throw new Error("L'identifiant utilisateur est requis.");
    }

    const noteId = await ctx.db.insert("notes", {
      userId: args.userId,
      summary: args.summary,
      todoList: args.todoList,
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
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    
    return await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Mutation pour supprimer une note
export const deleteNote = mutation({
  args: {
    id: v.id("notes"),
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
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Mutation pour cocher / décocher un élément de la todo list
export const toggleTodo = mutation({
  args: {
    noteId: v.id("notes"),
    index: v.number(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note non trouvée.");
    }
    // Règle 13 : Validation de propriété
    if (note.userId !== args.userId) {
      throw new Error("Action non autorisée.");
    }

    const newTodoList = [...note.todoList];
    if (args.index >= 0 && args.index < newTodoList.length) {
      newTodoList[args.index] = {
        ...newTodoList[args.index],
        done: !newTodoList[args.index].done,
      };
    } else {
      throw new Error("Index de tâche invalide.");
    }

    await ctx.db.patch(args.noteId, { todoList: newTodoList });
    return { success: true };
  },
});

// Mutation pour mettre à jour le contenu d'une note existante
export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    userId: v.string(),
    summary: v.string(),
    todoList: v.array(v.object({ text: v.string(), done: v.boolean() })),
    tags: v.array(v.string()),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) {
      throw new Error("Note non trouvée.");
    }
    // Règle 13 : Validation de propriété
    if (note.userId !== args.userId) {
      throw new Error("Action non autorisée.");
    }

    await ctx.db.patch(args.id, {
      summary: args.summary,
      todoList: args.todoList,
      tags: args.tags,
      embedding: args.embedding,
    });
    return args.id;
  },
});

// Requête interne pour récupérer une note par son identifiant
export const getNoteById = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
