import { cardGradient, patternStyle } from "@/lib/cardThemes";

/** A card-shaped surface painted with the card's theme gradient + pattern overlay. */
export function CardSurface({
  theme,
  pattern,
  className,
  children,
}: {
  theme?: string | null;
  pattern?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${cardGradient(theme)} ${className ?? ""}`}>
      {pattern && pattern !== "none" && (
        <div className="pointer-events-none absolute inset-0" style={patternStyle(pattern)} />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
