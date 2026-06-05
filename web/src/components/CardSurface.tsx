import { cardGradient, cardImage, patternStyle } from "@/lib/cardThemes";

/**
 * A card-shaped surface painted with the card's theme.
 *
 * - Classic themes: gradient + optional pattern overlay.
 * - Illustrated themes: a kid-art raster background (cover) over the themed
 *   gradient (which shows through while the image loads or if it's missing),
 *   plus a top/bottom dark scrim so the white card text stays legible.
 */
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
  const image = cardImage(theme);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${cardGradient(theme)} ${className ?? ""}`}>
      {image ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${image})` }}
          />
          {/* legibility scrim: darker at top (labels) and bottom (balance) */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60" />
        </>
      ) : (
        pattern && pattern !== "none" && (
          <div className="pointer-events-none absolute inset-0" style={patternStyle(pattern)} />
        )
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
