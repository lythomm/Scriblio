"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  MarkerType,
  NodeMouseHandler,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X, LayoutTemplate } from "lucide-react";
import dagre from "dagre";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface DbNode {
  _id: string;
  _creationTime: number;
  mindMapId: string;
  parentId?: string;
  label: string;
  positionX: number;
  positionY: number;
  color?: string;
}

interface WhiteboardCanvasProps {
  dbNodes: DbNode[];
  onDeleteNode: (id: string) => void;
  isListening: boolean;
}

// 1. Définition du composant Custom Node (Notion style)
const CustomNode = ({ data }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Dictionnaire de classes de couleurs pastel style Notion
  const colorMap: Record<string, string> = {
    white: "bg-white border-hairline text-ink",
    blue: "bg-[#e0f2fe] border-[#7dd3fc] text-[#0369a1]",
    green: "bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]",
    pink: "bg-[#fdf2f8] border-[#fbcfe8] text-[#be185d]",
    yellow: "bg-[#fefce8] border-[#fef08a] text-[#a16207]",
    purple: "bg-[#faf5ff] border-[#e9d5ff] text-[#7e22ce]",
  };

  const selectedColorClass = colorMap[data.color] || colorMap.white;

  // Synchronisation du texte externe
  useEffect(() => {
    if (textRef.current && !isEditing) {
      textRef.current.innerText = data.label;
    }
  }, [data.label, isEditing]);

  // Focus et sélection lors du passage en édition
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(textRef.current);
      range.collapse(false); // Curseur à la fin
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (!textRef.current) return;
    const newText = textRef.current.innerText.trim();
    if (newText && newText !== data.label) {
      data.onUpdateLabel(newText);
    } else {
      textRef.current.innerText = data.label;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (textRef.current) {
        textRef.current.innerText = data.label;
      }
      setIsEditing(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (!data.isListening && !isEditing) setIsEditing(true);
      }}
      className={`px-4 py-3 border rounded-lg shadow-soft text-sm font-sans min-w-[200px] max-w-[280px] relative group transition-all duration-150 ${selectedColorClass} ${isEditing ? "border-2 border-primary ring-2 ring-primary/20" : "hover:border-primary"
        }`}
    >
      {/* Port de connexion entrant (cible) à gauche */}
      <Handle
        type="target"
        position={Position.Left}
        className="!opacity-0"
      />

      <div
        ref={textRef}
        contentEditable={!data.isListening && isEditing}
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className={`font-semibold break-words leading-snug focus:outline-none ${isEditing ? "cursor-text select-text" : "cursor-pointer select-none"
          }`}
        title={isEditing ? undefined : "Cliquez pour modifier le texte"}
      >
        {data.label}
      </div>

      {/* Port de connexion sortant (source) à droite */}
      <Handle
        type="source"
        position={Position.Right}
        className="!opacity-0"
      />

      {/* Bouton de suppression manuel (affiché au survol en dehors des phases d'écoute et hors édition) */}
      {!data.isListening && data.onDelete && !isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete();
          }}
          className="absolute -top-2.5 -right-2.5 bg-white hover:bg-neutral-50 border border-hairline text-red-600 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-soft hover:scale-105 active:scale-95"
          title="Supprimer ce nœud et ses branches"
        >
          <X size={12} />
        </button>
      )}

      {/* Palette de couleurs au survol (hors phase d'écoute et hors édition) */}
      {!data.isListening && !isEditing && (
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white border border-hairline px-2 py-1 rounded-full shadow-soft flex items-center gap-1.5 z-20 pointer-events-auto">
          {[
            { name: "white", bg: "bg-white border-neutral-300" },
            { name: "blue", bg: "bg-[#e0f2fe] border-[#7dd3fc]" },
            { name: "green", bg: "bg-[#f0fdf4] border-[#bbf7d0]" },
            { name: "pink", bg: "bg-[#fdf2f8] border-[#fbcfe8]" },
            { name: "yellow", bg: "bg-[#fefce8] border-[#fef08a]" },
            { name: "purple", bg: "bg-[#faf5ff] border-[#e9d5ff]" },
          ].map((c) => (
            <button
              key={c.name}
              onClick={(e) => {
                e.stopPropagation();
                data.onUpdateColor(c.name === "white" ? undefined : c.name);
              }}
              className={`w-3.5 h-3.5 rounded-full border cursor-pointer hover:scale-125 active:scale-95 transition-transform ${c.bg} ${(data.color || "white") === c.name ? "ring-2 ring-primary/40" : ""
                }`}
              title={`Colorer en ${c.name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function WhiteboardCanvas({
  dbNodes,
  onDeleteNode,
  isListening,
}: WhiteboardCanvasProps) {
  const updatePositionMutation = useMutation(api.mindmaps.updateNodePosition);
  const updateNodeLabelMutation = useMutation(api.mindmaps.updateNode);
  const updateNodeColorMutation = useMutation(api.mindmaps.updateNodeColor);

  // Configuration des types de nœuds personnalisés
  const nodeTypes = useMemo(() => ({ mindmapNode: CustomNode }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Algorithme de positionnement automatique Dagre (de gauche à droite)
  const layoutGraph = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));

    // Configurer le graphe de gauche à droite (LR)
    g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 100 });

    currentNodes.forEach((node) => {
      g.setNode(node.id, { width: 220, height: 70 });
    });

    currentEdges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    return currentNodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 110,
          y: nodeWithPosition.y - 35,
        },
      };
    });
  }, []);

  // Synchronisation des nœuds et des lignes à partir de la base de données
  useEffect(() => {
    if (dbNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 1. Générer les nœuds React Flow
    const flowNodes: Node[] = dbNodes.map((dbNode) => ({
      id: dbNode._id,
      type: "mindmapNode",
      data: {
        label: dbNode.label,
        color: dbNode.color,
        onDelete: () => onDeleteNode(dbNode._id),
        onUpdateLabel: (newLabel: string) => {
          updateNodeLabelMutation({ id: dbNode._id as Id<"nodes">, label: newLabel });
        },
        onUpdateColor: (newColor: string | undefined) => {
          updateNodeColorMutation({ id: dbNode._id as Id<"nodes">, color: newColor });
        },
        isListening,
      },
      position: {
        x: dbNode.positionX,
        y: dbNode.positionY,
      },
    }));

    // 2. Générer les arêtes (edges / liaisons)
    const flowEdges: Edge[] = dbNodes
      .filter((dbNode) => dbNode.parentId)
      .map((dbNode) => ({
        id: `edge-${dbNode.parentId}-${dbNode._id}`,
        source: dbNode.parentId!,
        target: dbNode._id,
        type: "default",
        animated: isListening, // Animation dynamique des connexions pendant l'enregistrement
        style: { strokeWidth: 2 },
      }));

    // Si de nouveaux nœuds n'ont pas encore été positionnés (tous à 0,0 sauf la racine)
    // ou si c'est le premier rendu, on lance un positionnement automatique pour éviter les superpositions.
    const hasUnpositioned = dbNodes.some(
      (n) => n.parentId && n.positionX === 0 && n.positionY === 0
    );

    if (hasUnpositioned) {
      const layoutedNodes = layoutGraph(flowNodes, flowEdges);
      setNodes(layoutedNodes);
      setEdges(flowEdges);

      // Sauvegarder automatiquement les nouvelles positions calculées dans la base de données
      layoutedNodes.forEach((node) => {
        updatePositionMutation({
          id: node.id as Id<"nodes">,
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
        });
      });
    } else {
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [dbNodes, isListening, onDeleteNode, layoutGraph, updatePositionMutation, setNodes, setEdges]);

  // Déclencher la mise à jour de la position dans la base de données après un glisser-déposer
  const onNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      // Uniquement si l'IA n'est pas en train d'enregistrer/transcrire
      if (isListening) return;

      updatePositionMutation({
        id: node.id as Id<"nodes">,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      });
    },
    [isListening, updatePositionMutation]
  );

  // Fonction manuelle pour réorganiser proprement toute la carte
  const handleAutoLayout = () => {
    const layoutedNodes = layoutGraph(nodes, edges);
    setNodes(layoutedNodes);

    // Persister dans la base de données
    layoutedNodes.forEach((node) => {
      updatePositionMutation({
        id: node.id as Id<"nodes">,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      });
    });
  };

  return (
    <div className="w-full h-full relative bg-[#f6f5f4]">
      {/* Bouton de réorganisation en haut à droite du canvas */}
      <button
        onClick={handleAutoLayout}
        disabled={isListening}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-white hover:bg-neutral-50 border border-hairline rounded-md text-sm font-semibold shadow-soft text-ink cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        title="Réorganiser automatiquement le schéma"
      >
        <LayoutTemplate size={16} className="text-primary" />
        <span>Aligner le schéma</span>
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isListening ? undefined : onNodesChange}
        onEdgesChange={isListening ? undefined : onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={!isListening} // Désactiver le drag-and-drop pendant l'écoute IA
        nodesConnectable={false}
        elementsSelectable={!isListening}
      >
        <Controls />
        <MiniMap
          zoomable
          pannable
          nodeColor={(node) => {
            const color = (node.data as any)?.color;
            const hexMap: Record<string, string> = {
              white: "#d4d4d4",
              blue: "#0284c7",
              green: "#22c55e",
              pink: "#ec4899",
              yellow: "#eab308",
              purple: "#a855f7",
            };
            return hexMap[color as string] || "#d4d4d4";
          }}
          nodeStrokeColor={(node) => {
            const color = (node.data as any)?.color;
            const strokeMap: Record<string, string> = {
              white: "#a3a3a3",
              blue: "#0369a1",
              green: "#15803d",
              pink: "#be185d",
              yellow: "#a16207",
              purple: "#7e22ce",
            };
            return strokeMap[color as string] || "#a3a3a3";
          }}
          nodeBorderRadius={4}
        />
        <Background color="#a39e98" gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
