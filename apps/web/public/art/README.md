# Pixel character assets

Generated with the built-in imagegen tool. These are local runtime assets;
no external image service is needed to run the game.
The exact original/edit/final prompts are saved in `prompts.json`.

- `finance-bro-phone-sheet.png`: transparent RGBA, 1254 × 1254, 4 columns × 4 rows.
  Rows are idle, walk, cheer, and phone-reading; four animation frames per row.
  Frame sizes use normalized atlas coordinates, so the square sheet does not need
  to be divisible into integer source pixels. The React ChibiSprite component
  scales the complete atlas to four times its displayed frame size and CSS
  `steps(4)` advances one cell at a time. `paused`/`frame` select a still frame.
- `bank-interior.png`: 1536 × 1024 bank environment. Only Bank uses a full scene.
  The wake-up intro uses a small CSS bed/window vignette and the same character
  atlas. Stocks, Arbitrage, News and Portfolio remain simple phone screens.

Final character prompt (edit of the generated character atlas):

> Preserve the same adorable chibi finance bro, clothes, facial identity,
> transparent background, exact four-column/four-row cell layout and registration.
> Keep the first three rows as idle, walk and cheer. Change only the bottom row:
> replace the newspaper with a small dark smartphone held at chest height, with
> a light blue screen. Four subtle phone-reading frames, a blink and hand motion.
> Keep crisp square pixels, complete bodies, consistent scale and transparent
> padding. No labels or grid lines.

Final bank prompt:

> A cozy 16-bit pixel bank interior, straight-on with slight top-down perspective.
> Warm cream walls, wooden trim and teller counter, forest-green tile floor,
> banker lamp, stacked coins, brass bell, a little vault, plant and sunny window.
> Gold coin emblem, no lettering. No baked-in characters; leave the center floor
> open for the animated player. Crisp chunky pixels, brown outlines, few shades,
> no gradients, antialiasing, vector art, 3D rendering or watermark.

The initial character was generated as a four-by-four atlas: a dark-haired chibi
finance bro with warm skin, cream shirt, teal sweater vest, gold tie, navy trousers
and brown shoes. Idle, walking, celebrating and reading were the four rows. The
phone edit above is the final asset used by the app.
