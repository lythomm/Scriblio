import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  notes: defineTable({
    userId: v.string(), // ID de l'utilisateur propriétaire (Id<"users"> stocké sous forme de string)
    summary: v.string(), // Résumé / Synthèse
    todoList: v.optional(v.array(v.object({ text: v.string(), done: v.boolean() }))), // Déprécié
    tags: v.optional(v.array(v.string())), // Catégories thématiques
    audioStorageId: v.optional(v.id("_storage")), // Stockage optionnel de l'audio
    createdAt: v.number(), // Date de création
    embedding: v.optional(v.array(v.float64())), // Embedding sémantique
  })
    .index("by_user", ["userId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768, // Modèle text-embedding-004 de Gemini
    }),
  mindMaps: defineTable({
    title: v.string(),
    userId: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  nodes: defineTable({
    mindMapId: v.id("mindMaps"),
    parentId: v.optional(v.string()), // L'ID du parent (géré par Gemini ou l'UI)
    label: v.string(),
    positionX: v.number(),
    positionY: v.number(),
    color: v.optional(v.string()), // Couleur pastel optionnelle
  }).index("by_mindMapId", ["mindMapId"]),
});

