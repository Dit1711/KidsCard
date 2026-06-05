import React from "react";

/**
 * Lightweight Markdown renderer for AI chat replies — no dependency, just the
 * subset the tutor actually uses: **bold**, *italic*, `code`, bullet/numbered
 * lists, paragraphs and line breaks. Keeps replies readable and pretty.
 */

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded bg-white/10 px-1 py-0.5 text-[0.9em] font-mono">
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ChatMarkdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        if (lines.length === 0) return null;

        const isBullet = lines.every((l) => /^\s*[-*]\s+/.test(l));
        const isNumbered = lines.every((l) => /^\s*\d+\.\s+/.test(l));

        if (isBullet) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5">
              {lines.map((l, i) => <li key={i}>{renderInline(l.replace(/^\s*[-*]\s+/, ""))}</li>)}
            </ul>
          );
        }
        if (isNumbered) {
          return (
            <ol key={bi} className="list-decimal space-y-1 pl-5">
              {lines.map((l, i) => <li key={i}>{renderInline(l.replace(/^\s*\d+\.\s+/, ""))}</li>)}
            </ol>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, i) => (
              <React.Fragment key={i}>
                {renderInline(l)}
                {i < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
