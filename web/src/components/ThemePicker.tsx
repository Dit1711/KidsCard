import { CARD_THEMES, CARD_CATEGORIES, categoryLabel, themeLabel } from "@/lib/cardThemes";

/**
 * Grouped card-theme picker. Classic gradients and illustrated (kid-art) themes
 * are shown by category; illustrated themes preview their artwork (falling back
 * to the themed gradient until the asset is in place).
 */
export function ThemePicker({
  selected,
  onSelect,
  ringOffset = "ring-offset-[#15151f]",
}: {
  selected?: string | null;
  onSelect: (key: string) => void;
  ringOffset?: string;
}) {
  return (
    <div className="space-y-3">
      {CARD_CATEGORIES.map((cat) => {
        const themes = CARD_THEMES.filter((t) => t.category === cat);
        if (!themes.length) return null;
        return (
          <div key={cat}>
            <p className="text-[11px] uppercase tracking-wide text-white/40 mb-1.5">{categoryLabel(cat)}</p>
            <div className="grid grid-cols-4 gap-2">
              {themes.map((th) => (
                <button
                  key={th.key}
                  type="button"
                  onClick={() => onSelect(th.key)}
                  title={themeLabel(th.key)}
                  className={`relative h-12 overflow-hidden rounded-lg bg-gradient-to-br ${th.grad} ${
                    selected === th.key ? `ring-2 ring-white ring-offset-2 ${ringOffset}` : ""
                  }`}
                >
                  {th.image && (
                    <span
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${th.image})` }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
