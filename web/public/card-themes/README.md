# Card theme artwork

Drop the illustrated card backgrounds here. Each file maps to a theme `key` in
`web/src/lib/cardThemes.ts` (`image: "/card-themes/<key>.jpg"`).

Expected files (one per illustrated theme):

| Theme key    | File              | Subject            |
|--------------|-------------------|--------------------|
| `dino`       | `dino.jpg`        | Динозавры          |
| `monsters`   | `monsters.jpg`    | Милые монстрики    |
| `dragon`     | `dragon.jpg`      | Драконы            |
| `unicorn`    | `unicorn.jpg`     | Единороги          |
| `space`      | `space.jpg`       | Космос             |
| `underwater` | `underwater.jpg`  | Подводный мир      |
| `robots`     | `robots.jpg`      | Роботы             |
| `racing`     | `racing.jpg`      | Гонки              |

## Asset spec
- **Format:** `.jpg` (or `.png`), landscape ~**1792×1024** (16:9).
- **Style:** one consistent kid game-cover style across all (see DALL·E prompts).
- **No text / no logos / no trademarked characters** — original art only.
- **Composition:** main subject upper-center; keep the bottom a bit calmer/darker
  (the card shows balance there). The app also lays a dark top/bottom scrim over
  the image for text legibility.
- **Size:** compress to web-friendly (~150–300 KB each) before committing.

Until a file is present, the card falls back to that theme's gradient — so the UI
works before the art lands.
