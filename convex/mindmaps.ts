import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Requête pour récupérer les mind maps de l'utilisateur connecté
export const getMindMaps = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("mindMaps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Requête pour récupérer une mind map par son ID
export const getMindMapById = query({
  args: { id: v.id("mindMaps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const mindMap = await ctx.db.get(args.id);
    if (!mindMap || mindMap.userId !== userId) return null;

    return mindMap;
  },
});

// Mutation pour créer une nouvelle mind map (avec un nœud racine par défaut)
export const createMindMap = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non connecté.");

    const mindMapId = await ctx.db.insert("mindMaps", {
      title: args.title,
      userId,
      createdAt: Date.now(),
    });

    // Créer un nœud racine par défaut au centre (0, 0)
    await ctx.db.insert("nodes", {
      mindMapId,
      label: args.title || "Sujet central",
      positionX: 0,
      positionY: 0,
    });

    return mindMapId;
  },
});

// Mutation pour supprimer une mind map et tous ses nœuds associés
export const deleteMindMap = mutation({
  args: { id: v.id("mindMaps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autorisé.");

    const mindMap = await ctx.db.get(args.id);
    if (!mindMap || mindMap.userId !== userId) throw new Error("Mind map non trouvée ou non autorisée.");

    // Supprimer tous les nœuds de cette mind map
    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_mindMapId", (q) => q.eq("mindMapId", args.id))
      .collect();

    for (const node of nodes) {
      await ctx.db.delete(node._id);
    }

    // Supprimer la mind map elle-même
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

// Requête pour obtenir tous les nœuds d'une mind map
export const getNodes = query({
  args: { mindMapId: v.id("mindMaps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const mindMap = await ctx.db.get(args.mindMapId);
    if (!mindMap || mindMap.userId !== userId) return [];

    return await ctx.db
      .query("nodes")
      .withIndex("by_mindMapId", (q) => q.eq("mindMapId", args.mindMapId))
      .collect();
  },
});

// Mutation pour créer un nœud
export const createNode = mutation({
  args: {
    mindMapId: v.id("mindMaps"),
    label: v.string(),
    parentId: v.optional(v.string()),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autorisé.");

    const mindMap = await ctx.db.get(args.mindMapId);
    if (!mindMap || mindMap.userId !== userId) throw new Error("Accès non autorisé.");

    const nodeId = await ctx.db.insert("nodes", {
      mindMapId: args.mindMapId,
      parentId: args.parentId,
      label: args.label,
      positionX: args.positionX ?? 0,
      positionY: args.positionY ?? 0,
    });

    return nodeId;
  },
});

// Mutation pour modifier le label d'un nœud
export const updateNode = mutation({
  args: {
    id: v.id("nodes"),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autorisé.");

    const node = await ctx.db.get(args.id);
    if (!node) throw new Error("Nœud non trouvé.");

    const mindMap = await ctx.db.get(node.mindMapId);
    if (!mindMap || mindMap.userId !== userId) throw new Error("Non autorisé.");

    await ctx.db.patch(args.id, { label: args.label });
    return args.id;
  },
});

// Mutation pour modifier le parent d'un nœud (le déplacer)
export const moveNode = mutation({
  args: {
    id: v.id("nodes"),
    newParentId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autorisé.");

    const node = await ctx.db.get(args.id);
    if (!node) throw new Error("Nœud non trouvé.");

    const mindMap = await ctx.db.get(node.mindMapId);
    if (!mindMap || mindMap.userId !== userId) throw new Error("Non autorisé.");

    await ctx.db.patch(args.id, { parentId: args.newParentId });
    return args.id;
  },
});

// Mutation pour modifier la position d'un nœud (quand l'utilisateur le glisse sur le tableau blanc)
export const updateNodePosition = mutation({
  args: {
    id: v.id("nodes"),
    positionX: v.number(),
    positionY: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autorisé.");

    const node = await ctx.db.get(args.id);
    if (!node) throw new Error("Nœud non trouvé.");

    const mindMap = await ctx.db.get(node.mindMapId);
    if (!mindMap || mindMap.userId !== userId) throw new Error("Non autorisé.");

    await ctx.db.patch(args.id, {
      positionX: args.positionX,
      positionY: args.positionY,
    });
    return args.id;
  },
});

// Mutation récursive pour supprimer un nœud et tous ses descendants
export const deleteNode = mutation({
  args: {
    id: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autorisé.");

    const targetNode = await ctx.db.get(args.id);
    if (!targetNode) throw new Error("Nœud non trouvé.");

    const mindMap = await ctx.db.get(targetNode.mindMapId);
    if (!mindMap || mindMap.userId !== userId) throw new Error("Non autorisé.");

    // Récupérer tous les nœuds de la carte pour faire un parcours et supprimer récursivement
    const allNodes = await ctx.db
      .query("nodes")
      .withIndex("by_mindMapId", (q) => q.eq("mindMapId", targetNode.mindMapId))
      .collect();

    const idsToDelete = new Set<string>([args.id]);
    let added = true;

    // On répète l'exploration jusqu'à ce qu'aucun nouvel enfant ne soit trouvé
    while (added) {
      added = false;
      for (const node of allNodes) {
        if (node.parentId && idsToDelete.has(node.parentId) && !idsToDelete.has(node._id)) {
          idsToDelete.add(node._id);
          added = true;
        }
      }
    }

    // Supprimer tous les nœuds identifiés
    const idsArray: string[] = [];
    idsToDelete.forEach((id) => idsArray.push(id));
    for (const id of idsArray) {
      await ctx.db.delete(id as any);
    }

    return { success: true, deletedCount: idsToDelete.size };
  },
});

// Action sécurisée pour récupérer la clé API Gemini
export const getGeminiApiKey = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Non autorisé.");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY non configurée.");

    return apiKey;
  },
});
