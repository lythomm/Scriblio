"use client";

import { useState, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface UseGeminiLiveProps {
  mindMapId: Id<"mindMaps"> | null;
  onShowToast: (message: string, type: "success" | "error" | "warning") => void;
}

export function useGeminiLive({ mindMapId, onShowToast }: UseGeminiLiveProps) {
  const getApiKey = useAction(api.mindmaps.getGeminiApiKey);
  const nodes = useQuery(api.mindmaps.getNodes, mindMapId ? { mindMapId } : "skip") || [];

  // Mutations Convex de structure
  const createNodeMutation = useMutation(api.mindmaps.createNode);
  const deleteNodeMutation = useMutation(api.mindmaps.deleteNode);
  const updateNodeMutation = useMutation(api.mindmaps.updateNode);
  const moveNodeMutation = useMutation(api.mindmaps.moveNode);
  const updateNodeColorMutation = useMutation(api.mindmaps.updateNodeColor);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInputRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Compteur d'enregistrement
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      cleanupAudioAndWS();
    };
  }, []);

  const cleanupAudioAndWS = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioInputRef.current) {
      audioInputRef.current.disconnect();
      audioInputRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    setIsRecording(false);
    setIsConnecting(false);
  };

  const startSession = async () => {
    if (!mindMapId) {
      onShowToast("Aucun tableau blanc actif.", "error");
      return;
    }
    console.log("[GeminiLive] startSession: initialisation de la session...");
    cleanupAudioAndWS();
    setIsConnecting(true);

    try {
      console.log("[GeminiLive] startSession: récupération de la clé API...");
      const apiKey = await getApiKey();
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      console.log("[GeminiLive] Connexion WebSocket...");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        try {
          console.log("[GeminiLive] WebSocket ouvert (onopen)");
          sendSetupMessage(ws, nodes);
        } catch (err) {
          console.error("[GeminiLive] Erreur dans onopen:", err);
          cleanupAudioAndWS();
        }
      };

      ws.onmessage = async (event) => {
        let textData = "";

        if (event.data instanceof Blob) {
          try {
            textData = await event.data.text();
          } catch (err) {
            return;
          }
        } else if (typeof event.data === "string") {
          textData = event.data;
        } else {
          return;
        }

        try {
          const response = JSON.parse(textData);
          console.log("[GeminiLive] Message WebSocket reçu:", response);

          if (response.setupComplete) {
            console.log("[GeminiLive] Connexion IA établie (setupComplete)");
            startAudioRecording(ws);
            return;
          }

          if (response.toolCall && response.toolCall.functionCalls) {
            console.log("[GeminiLive] Appel d'outils détecté:", response.toolCall.functionCalls);
            for (const call of response.toolCall.functionCalls) {
              await handleToolCall(ws, call);
            }
          }
        } catch (err) {
          // Si le parsing échoue, c'est probablement le flux audio sortant de Gemini sous forme de Blob
          // On l'ignore silencieusement pour ne pas polluer la console.
        }
      };

      ws.onerror = (err) => {
        console.error("[GeminiLive] Erreur WebSocket Gemini Live (onerror) :", err);
        onShowToast("Erreur de connexion avec l'IA.", "error");
        cleanupAudioAndWS();
      };

      ws.onclose = (event) => {
        console.log("[GeminiLive] WebSocket fermé (onclose) - code:", event.code, "raison:", event.reason);
        cleanupAudioAndWS();
      };

    } catch (err: any) {
      console.error("[GeminiLive] Erreur démarrage session :", err);
      onShowToast("Impossible de démarrer la session vocale.", "error");
      cleanupAudioAndWS();
    }
  };

  const stopSession = () => {
    cleanupAudioAndWS();
  };

  // Envoi de la configuration de départ
  const sendSetupMessage = (ws: WebSocket, currentNodes: { _id: string; label: string; parentId?: string }[]) => {
    console.log("[GeminiLive] sendSetupMessage: envoi de la configuration initiale...");
    
    const nodesContext = currentNodes
      .map((n: any) => `- ID: "${n._id}", Label: "${n.label}", ParentID: "${n.parentId || 'aucun (racine)'}", Couleur: "${n.color || 'white'}"`)
      .join("\n");

    const setupMsg = {
      setup: {
        model: "models/gemini-3.1-flash-live-preview",
        generationConfig: {
          responseModalities: ["AUDIO"],
        },
        systemInstruction: {
          parts: [
            {
              text: `Tu es le moteur d'intelligence artificielle de la carte heuristique (mind map) de Scriblio.
Ton rôle est de structurer la pensée de l'utilisateur en temps réel uniquement à travers les outils (Tool Calls) qui te sont fournis.

Voici la structure actuelle (les nœuds existants sur le tableau blanc) :
${nodesContext || 'Aucun nœud existant pour le moment (la base de données est vide)'}

Règles de comportement :
1. Écoute le flux audio de l'utilisateur. Ignore les tics de langage, hésitations ("euuuh", "alors", "du coup"), bégaiements ou répétitions.
2. Nettoie la formulation pour la rendre professionnelle et structurée. Conserve scrupuleusement tous les détails précis, les chiffres, les noms propres et les termes clés (ne simplifie pas à l'excès).
3. Appelle l'un des outils suivants dès que l'utilisateur exprime une idée complète ou une commande de modification :
   - addNode(label, parentId, color) : Ajoute une branche sous le parent spécifié. L'argument parentId DOIT correspondre à l'un des IDs existants. Optionnellement, attribue une couleur ("white", "blue", "green", "pink", "yellow", "purple") pour catégoriser le nœud. Devine la couleur selon le thème (ex: "green" pour marketing/stratégie, "pink" pour design/direction artistique, "blue" pour technique/recherche, "yellow" pour brainstorm/idées, "purple" pour concept/logo, ou "white" par défaut) ou utilise la couleur demandée explicitement.
   - deleteNode(id) : Supprime la branche concernée.
   - updateNode(id, label) : Modifie l'intitulé d'un nœud.
   - updateNodeColor(id, color) : Modifie la couleur d'un nœud par son ID.
   - moveNode(id, newParentId) : Change le nœud parent pour déplacer une sous-branche entière.
4. L'utilisateur peut parler de manière continue ou corriger ses propres propos (ex: "Mets le nœud marketing en vert", "En fait, enlève le nœud logo"). Analyse ces corrections pour modifier l'arbre en conséquence.
5. NE GÉNÈRE AUCUNE RÉPONSE TEXTUELLE OU VOCALE CONVERSATIONNELLE. Utilise exclusivement les appels de fonction (Tool Calls).`
            }
          ]
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "addNode",
                description: "Crée un nouveau nœud dans la mind map sous un parent donné, avec une couleur thématique optionnelle.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    label: { type: "STRING", description: "Le texte structuré et légèrement synthétisé du nœud" },
                    parentId: { type: "STRING", description: "L'identifiant unique (ID) du nœud parent sous lequel insérer la branche" },
                    color: { 
                      type: "STRING", 
                      description: "Couleur thématique optionnelle. Valeurs autorisées: white, blue, green, pink, yellow, purple.",
                      enum: ["white", "blue", "green", "pink", "yellow", "purple"]
                    }
                  },
                  required: ["label"]
                }
              },
              {
                name: "deleteNode",
                description: "Supprime un nœud de la mind map par son ID.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING", description: "L'ID unique du nœud à supprimer" }
                  },
                  required: ["id"]
                }
              },
              {
                name: "updateNode",
                description: "Modifie ou renomme le label d'un nœud existant par son ID.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING", description: "L'ID unique du nœud à modifier" },
                    label: { type: "STRING", description: "Le nouveau texte à associer au nœud" }
                  },
                  required: ["id", "label"]
                }
              },
              {
                name: "updateNodeColor",
                description: "Modifie la couleur d'un nœud existant par son ID.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING", description: "L'ID unique du nœud à modifier" },
                    color: { 
                      type: "STRING", 
                      description: "La nouvelle couleur. Valeurs autorisées: white, blue, green, pink, yellow, purple.",
                      enum: ["white", "blue", "green", "pink", "yellow", "purple"]
                    }
                  },
                  required: ["id", "color"]
                }
              },
              {
                name: "moveNode",
                description: "Déplace un nœud (et ses enfants) sous un nouveau parent.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING", description: "L'ID unique du nœud à déplacer" },
                    newParentId: { type: "STRING", description: "L'ID unique du nouveau parent" }
                  },
                  required: ["id", "newParentId"]
                }
              }
            ]
          }
        ]
      }
    };

    ws.send(JSON.stringify(setupMsg));
  };

  // Enregistrement et encodage PCM 16kHz vers la WebSocket
  const startAudioRecording = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      audioInputRef.current = source;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Conversion de Float32 à PCM16 (Int16)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const val = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = val < 0 ? val * 0x8000 : val * 0x7fff;
        }

        // Encodage en Base64
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = "";
        const len = uint8.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64Data = btoa(binary);

        // Envoi du bloc audio
        ws.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: base64Data,
              },
            },
          })
        );
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setIsConnecting(false);
    } catch (err: any) {
      console.error("[GeminiLive] Impossible d'accéder au microphone :", err);
      onShowToast("Erreur d'accès au micro.", "error");
      cleanupAudioAndWS();
    }
  };

  // Exécuter et répondre aux appels de fonctions (Tool Calls) de Gemini
  const handleToolCall = async (ws: WebSocket, call: any) => {
    const { name, args, id } = call;
    console.log(`[GeminiLive] Outil "${name}" appelé avec arguments:`, args);
    let output = {};

    try {
      if (name === "addNode") {
        const parentId = args.parentId || undefined;
        const nodeId = await createNodeMutation({
          mindMapId: mindMapId!,
          label: args.label,
          parentId,
          color: args.color || undefined,
        });
        output = { id: nodeId };
      } else if (name === "deleteNode") {
        const result = await deleteNodeMutation({ id: args.id });
        output = { success: result.success };
      } else if (name === "updateNode") {
        const nodeId = await updateNodeMutation({ id: args.id, label: args.label });
        output = { id: nodeId };
      } else if (name === "updateNodeColor") {
        const nodeId = await updateNodeColorMutation({ id: args.id, color: args.color || undefined });
        output = { id: nodeId };
      } else if (name === "moveNode") {
        const nodeId = await moveNodeMutation({ id: args.id, newParentId: args.newParentId });
        output = { id: nodeId };
      }
    } catch (err: any) {
      console.error(`[GeminiLive] Erreur d'exécution de l'outil ${name} :`, err);
      output = { error: err.message };
    }

    // Répondre à Gemini sur le canal WebSocket
    if (ws.readyState === WebSocket.OPEN) {
      const responseMsg = {
        toolResponse: {
          functionResponses: [
            {
              name,
              response: { output },
              id,
            },
          ],
        },
      };
      ws.send(JSON.stringify(responseMsg));
    }
  };

  return {
    isRecording,
    recordingDuration,
    isConnecting,
    startSession,
    stopSession,
  };
}
