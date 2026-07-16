"use client";

import React, { useCallback, useEffect, useMemo } from "react";
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
}

interface WhiteboardCanvasProps {
  dbNodes: DbNode[];
  onDeleteNode: (id: string) => void;
  isListening: boolean;
}

// 1. Définition du composant Custom Node (Notion style)
const CustomNode = ({ data }: any) => {
  return (
    <div className="px-4 py-3 bg-white border border-hairline rounded-lg shadow-soft text-ink text-sm font-sans min-w-[200px] max-w-[280px] relative group hover:border-primary transition-all duration-150">
      <div className="font-semibold break-words leading-snug">{data.label}</div>
      
      {/* Bouton de suppression manuel (affiché au survol en dehors des phases d'écoute) */}
      {!data.isListening && data.onDelete && (
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
    </div>
  );
};

export default function WhiteboardCanvas({
  dbNodes,
  onDeleteNode,
  isListening,
}: WhiteboardCanvasProps) {
  const updatePositionMutation = useMutation(api.mindmaps.updateNodePosition);

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
        onDelete: () => onDeleteNode(dbNode._id),
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
        type: "smoothstep",
        animated: isListening, // Animation dynamique des connexions pendant l'enregistrement
        style: { stroke: "#0075de", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: "#0075de",
        },
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
        <MiniMap zoomable pannable nodeColor="#0075de" />
        <Background color="#a39e98" gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
