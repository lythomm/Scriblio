import React from "react";

/**
 * Convertit du texte markdown basique (gras, italique, listes à puces)
 * en éléments React. Utilisé dans les notes et le chat.
 */
export const renderMarkdown = (text: string) => {
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    // Détection des puces (* ou -)
    const bulletMatch = line.match(/^(\s*)[*-]\s+(.*)$/);

    // Remplacement du gras (**) et de l'italique (*)
    const formatText = (str: string) => {
      // 1. Découpage du gras
      const boldParts = str.split(/\*\*([^*]+)\*\*/g);
      return boldParts.map((boldPart, bIdx) => {
        const isBold = bIdx % 2 === 1;

        // 2. Découpage de l'italique dans chaque segment
        const italicParts = boldPart.split(/\*([^*]+)\*/g);
        const renderedItalics = italicParts.map((italicPart, iIdx) => {
          const isItalic = iIdx % 2 === 1;
          if (isItalic) {
            return <em key={iIdx} className="italic text-ink-muted">{italicPart}</em>;
          }
          return italicPart;
        });

        if (isBold) {
          return <strong key={bIdx} className="font-bold text-ink">{renderedItalics}</strong>;
        }
        return <React.Fragment key={bIdx}>{renderedItalics}</React.Fragment>;
      });
    };

    if (bulletMatch) {
      const content = bulletMatch[2];
      return (
        <li key={lineIdx} className="list-disc ml-5 mb-1 text-sm leading-relaxed">
          {formatText(content)}
        </li>
      );
    }

    return (
      <p key={lineIdx} className="mb-2 text-sm leading-relaxed min-h-[1rem]">
        {formatText(line)}
      </p>
    );
  });
};
