# CLAUDE.md — The Sunless Vault

A single-file browser roguelike. Everything — markup, CSS, and game logic —
lives in `roguelike.html` (~900 lines, vanilla JS, canvas rendering, no build
step, no dependencies). Open the file in a browser to play; there is nothing to
compile or serve.

This document captures the architecture so changes can be made safely without
re-reading the whole file each time.

## Repository note

This repo also contains an unrelated project (`provision.js`, `care-circle.config.json`,
a Care Circle Notion provisioner). The roguelike work is confined to
`roguelike.html`, `CLAUDE.md`, and `NOTES.md`. Keep it that way — one file for
the game, per the current task constraints.

## The tile grid

- The map is a fixed `W × H` grid of tiles (`W = 60`, `H = 33`), stored in the
  global `tiles` as `tiles[y][x]` (row-major: **y first, then x**). A tile is
  either `"#"` (wall) or `"."` (floor). `blankGrid(fill)` builds an `H`-row by
  `W`-column array.
- Rendering constants: each cell is `CW × CH` pixels (`17 × 20`). The canvas is
  sized `W*CW × H*CH`. Glyphs are drawn centered in their cell by `draw()`'s
  local `put(glyph, x, y, color)` helper.
- Parallel grids, all `[y][x]` and regenerated per floor in `generateMap()`:
  - `tiles` — terrain (`"#"` / `"."`).
  - `visible` — booleans, recomputed every turn by the FOV pass; what the player
    can see *right now*.
  - `explored` — booleans, sticky; any tile ever seen, drawn dimmed when not
    currently visible.
- Key query helpers:
  - `walkable(x, y)` — in bounds **and** `tiles[y][x] === "."`. This is terrain
    only; it does **not** account for occupying monsters.
  - `opaque(x, y)` — out of bounds or a wall; used by FOV.
  - `entityAt(x, y)` / `itemAt(x, y)` — linear scans of the `entities` / `items`
    arrays.

### Map generation

`generateMap()` places up to `maxRooms` non-overlapping rectangular rooms
(`makeRoom` / `carveRoom`), joins consecutive rooms with L-shaped corridors
(`connect` → `carveH` / `carveV`), then adds a few extra random connections so
floors have loops rather than a pure tree. The player spawns in room 0; the
stairs (`stairs = {x, y}`) go in the farthest room by Manhattan distance.
Monsters and items are spawned per room (skipping room 0) via `spawnMonster` /
`spawnItem`, scaled by `depth`. On the last floor (`depth === MAX_DEPTH`, 10) the
Amulet of the Vault is placed on the stairs as the win condition.

## Field of view — recursive shadowcasting

FOV is classic eight-octant recursive shadowcasting with a radius of
`FOV_RADIUS` (8 tiles), centered on the player.

- `OCTANTS` is the table of 8 `[xx, xy, yx, yy]` transform coefficients, one per
  octant, that map octant-local `(dx, dy)` offsets into world `(X, Y)`.
- `castLight(cx, cy, row, start, end, radius, xx, xy, yx, yy)` is the recursive
  core. It sweeps rows outward, tracking a shrinking slope window `[start, end]`.
  When it hits an opaque tile mid-scan it recurses for the sub-window beyond the
  blocker and continues with a narrowed slope. Tiles within the circular radius
  get `visible[Y][X] = true` and `explored[Y][X] = true`.
- `computeFOV()` clears `visible`, lights the player's own tile, then calls
  `castLight` once per octant. It is invoked in the input handler both before and
  after the monster turn so the displayed light matches the post-move state.

`visible` is the authority for what monsters can see too — see the turn loop.

## The turn loop

The game is strictly turn-based and synchronous; there is no animation loop or
timer. The single `keydown` listener drives everything:

1. If `gameOver`, ignore input.
2. Map the key to an action:
   - movement (`MOVES` table: arrows, `hjkl`, diagonals `yubn`) → `tryMove(dx, dy)`
   - `.` / `5` → wait, `g` → `pickUp()`, `>` → `descend()`, `1`–`9` → `useItem()`
3. Each action returns `tookTurn` (a boolean). Moving into a monster calls
   `playerAttack` and counts as a turn; bumping a wall does not.
4. After the player acts: `computeFOV()`, then **if `tookTurn`**, call
   `monsterTurn()`. Then `computeFOV()` again and `draw()`.

So the canonical order each turn is: **player acts → FOV → monsters act → FOV →
render.** Monsters only get a turn when the player actually spent one.

### `monsterTurn()`

Iterates a snapshot copy of `entities` (`[...entities]`) so kills during the loop
don't corrupt iteration. For each living monster:

- **Confused** (`m.confused > 0`): decrement the counter and stumble in a random
  direction (if walkable/unoccupied). Skip normal AI.
- **Out of sight**: `if (!visible[m.y][m.x]) continue;` — a monster acts **only
  when the player can currently see it**. This is the key gating rule and must be
  preserved by any AI change: off-screen monsters are frozen.
- **Adjacent** (Chebyshev `dist === 1`): call `monsterAttack(m)`.
- **Otherwise**: move one step toward the player. (This is the movement the A*
  task replaces — see NOTES.md. Combat gating and the visibility rule stay.)

Monster movement must respect `walkable`, avoid other `entityAt` tiles, and never
step onto the player's tile (adjacency is handled by the attack branch).

## Combat and progression

- `damageRoll(power, def)` → `max(1, randInt(ceil(power*0.6), power) - def)`.
- `playerAttack` / `monsterAttack` apply damage; player attack uses
  `attackPower()` (`power` + weapon bonus), defence uses `defence()` (`def` +
  armour bonus). Monster death removes it from `entities` and grants `gainXP`.
- `gainXP` handles level-ups (more maxHp/power, periodic def, `xpNext` grows ×1.8).
- `die()` / `win()` set `gameOver` and show the overlay; `ov-btn` restarts via
  `newGame()`.

## How monsters scale with depth

Set in `spawnMonster` when a monster is instantiated from a `BESTIARY` template:

```js
const hpScale  = 1 + (depth - 1) * 0.14;   // HP grows ~14% per floor
const powScale = 1 + (depth - 1) * 0.04;   // power grows ~4% per floor
hp   = round(template.hp    * hpScale)
power= round(template.power * powScale)
def  = template.def + floor((depth - 1) / 5)   // +1 defence every 5 floors
```

So deeper monsters are *much* tankier but hit only a little harder, and pick up a
little armour every five floors. Which monsters can appear is also depth-gated:
`BESTIARY` entries carry `minDepth` and a `weight(depth)` function, and
`weighted(table, depth)` does the depth-filtered weighted roll (same mechanism
gates `LOOT`). Per-room monster/item counts also rise with depth in
`generateMap()`.

## Conventions / gotchas

- Grids are indexed `[y][x]`. Mixing this up is the easiest bug to introduce.
- `walkable()` is terrain-only; occupancy is a separate `entityAt()` check.
- `visible`/`explored` are rebuilt fresh each `generateMap()` — don't hold stale
  references across floors.
- Keep everything in the one file; no build step, no external libraries.
