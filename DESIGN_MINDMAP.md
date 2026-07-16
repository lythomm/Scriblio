# Conception : Création de Mind Maps par la Voix en Temps Réel

Ce document détaille l'architecture et les spécifications techniques pour l'implémentation de la création progressive de cartes heuristiques (*mind maps*) sur un tableau blanc virtuel, pilotée par la voix et en temps réel.

## 1. Synthèse de Compréhension
*   **Objectif** : Permettre à un utilisateur de construire, modifier et organiser une carte heuristique à l'oral, de manière fluide et interactive.
*   **Expérience cible** : L'utilisateur parle naturellement. L'IA écoute en continu via un canal à très faible latence, filtre les hésitations ("euuuh") et dessine/organise les nœuds sur le tableau blanc avec des animations fluides en moins de 1 seconde après la fin d'une phrase.
*   **Cible utilisateur** : Usage individuel interactif (un seul micro actif à la fois), avec possibilité de partage d'écran passif.
*   **Non-objectifs** : Édition vocale collaborative multi-utilisateurs en simultané ; mode hors-ligne.

## 2. Hypothèses Techniques
*   Connexion persistante directe en **WebRTC** entre le navigateur client et l'API Gemini Live.
*   Le flux audio est traité en mémoire à la volée par Gemini, sans stockage de fichiers audio bruts.
*   Utilisation de la base de données réactive **Convex** pour synchroniser instantanément l'état de la carte heuristique.
*   Le calcul de positionnement géométrique automatique est déporté sur le client via un moteur de layout (*Dagre*) pour éviter les calculs lourds côté serveur.

## 3. Log des Décisions (Decision Log)

| Décision | Options considérées | Option choisie | Justification |
| :--- | :--- | :--- | :--- |
| **Pipeline Voix** | A) Chunking audio (3s)<br>B) Streaming Gemini Live | **B) Gemini Live (WebRTC)** | Offre la latence la plus basse possible (< 800ms) et bénéficie des quotas gratuits généreux de Google AI Studio. |
| **Synthétisation** | A) Titre court + description<br>B) Phrase synthétisée simple | **B) Phrase synthétisée simple** | Souhait d'une seule donnée par nœud tout en évitant une simplification trop agressive qui ferait perdre l'essence du message. |
| **Rendu Graphique** | A) SVG + Framer Motion<br>B) React Flow | **B) React Flow** | Gère nativement le canvas infini, le zoom, le panoramique et le déplacement manuel des nœuds sans réinventer la roue. |

## 4. Architecture Détaillée

### Schéma de Données (Convex)
Les tables sont déclarées dans `convex/schema.ts` :

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  mindMaps: defineTable({
    title: v.string(),
    userId: v.string(),
    createdAt: v.number(),
  }),
  nodes: defineTable({
    mindMapId: v.id("mindMaps"),
    parentId: v.optional(v.string()), // ID du nœud parent (string pour compatibilité des IDs générés par le LLM)
    label: v.string(),                 // Texte synthétisé et nettoyé
    positionX: v.number(),
    positionY: v.number(),
  }).index("by_mindMapId", ["mindMapId"]),
});
```

### Outils (Tool Calls) déclarés pour Gemini Live
L'API Gemini Live est configurée avec les outils suivants :

1.  **`addNode(label: string, parentId?: string)`** : Crée un nœud.
2.  **`deleteNode(id: string)`** : Supprime un nœud et ses sous-branches.
3.  **`updateNode(id: string, newLabel: string)`** : Modifie le texte d'un nœud.
4.  **`moveNode(id: string, newParentId: string)`** : Modifie la relation parent-enfant.

### Consigne Système (System Instructions)
```text
Tu es le moteur de structuration de mind map de Scriblio. Ton unique moyen d'action est l'appel des outils addNode, deleteNode, updateNode et moveNode.

Règles de traitement :
1. Écoute le flux audio. Ignore les tics de langage ("euuuh", répétitions, bégaiements).
2. Reformule les propos de l'utilisateur sous forme de phrases courtes, claires et lisibles. Ne perds pas les détails importants, chiffres ou termes clés.
3. Lorsqu'une idée complète ou une commande est formulée, appelle l'outil adéquat.
4. N'émets aucun texte conversationnel à l'oral ou à l'écrit. Utilise uniquement les appels de fonctions.
```

### Gestion du Layout (Client)
À chaque modification de la liste des nœuds reçue de Convex :
1.  Le client React extrait la structure de l'arbre.
2.  Il passe cette structure à **Dagre** (`dagre`) pour calculer automatiquement les nouvelles coordonnées `(positionX, positionY)`.
3.  Ces positions sont appliquées aux nœuds de **React Flow** qui les anime de façon fluide vers leur nouvel emplacement.

## 5. Risques et Atténuations
*   **Coupure Réseau** : En cas de déconnexion WebRTC, l'interface client doit tenter une reconnexion automatique en tâche de fond et restaurer la session avec l'historique textuel récent pour que l'IA reprenne le contexte.
*   **Limites de Débit (Rate Limits)** : Les appels Gemini Live gratuits ont des limites d'utilisation. Pour une production avec plus d'utilisateurs, une clé API pay-as-you-go avec un budget limite de sécurité (ex. 5 $/mois) résout le problème.
