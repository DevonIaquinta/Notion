# NOTES.md — running log

A log of what we try and what we reject, with the reason. Newest entries at the
top.

---

## 2026-09-12 — Monster pathfinding: greedy step → A*

**Problem.** `monsterTurn()` moved each monster with a greedy one-step choice:
try the diagonal toward the player, then the horizontal, then the vertical
(`options = [[sx,sy],[sx,0],[0,sy]]`). This has no notion of the map's shape, so
monsters get wedged on wall corners and doorways — they shove toward the player's
direction even when the only route is *away* first. Concave walls and single-tile
doorways trap them.

**Chosen approach.** Replace the movement (only) with A* on the walkable grid,
4-directional (orthogonal) movement with Manhattan heuristic, stepping the
monster one tile along the computed path each turn. Everything else in the turn
loop is untouched: the confusion branch, the `!visible[m.y][m.x]` sight gate, the
Chebyshev adjacency → `monsterAttack` branch, and the occupancy/player-tile
rules.

- **4-dir, not 8-dir.** Monster movement in the greedy version could go diagonal,
  but the map is carved with orthogonal corridors and diagonal squeezes through
  wall corners look wrong / can clip. Orthogonal A* gives clean corridor-following
  and the Manhattan heuristic stays admissible. (Recorded as a deliberate minor
  behavior change; revisit if diagonal pursuit is wanted.)
- **Target-adjacent goal.** The player's own tile isn't walkable terrain-wise
  (it's floor, but occupied), and we never want to path *onto* it — adjacency is
  the attack branch. A* searches toward the player's tile but treats stepping
  onto the player as the goal's neighbor: we allow the player tile as the search
  target and simply take the first step, since the adjacency check fires before
  movement anyway.
- **Occupancy.** Other monsters block tiles. We treat currently-occupied tiles as
  non-walkable during the search *except* the goal, so a conga line doesn't make
  everyone freeze; if the best next step is blocked by another monster this turn,
  the monster waits (acceptable — it'll re-path next turn).

**Budget / caching.** A floor can hold ~20 monsters and A* runs every turn, so
naive full searches per monster per turn could stall. Mitigations:

- Only monsters the player can see path at all (the sight gate already culls most
  of them most of the time — the expensive case is a room full of visible foes).
- Per-search **node-expansion cap**: `ASTAR_MAX_NODES = W * H` (the whole grid,
  1980). The map is small and connected and the player is visible to any monster
  that paths, so a route almost always exists and is short — A* settles far fewer
  nodes than the grid for a real path. The cap is set to the full grid on purpose
  so a *solvable* floor never spuriously falls back; it only bites the pathological
  / unreachable case, bounding it to a single full-grid sweep (then greedy
  fallback). Scratch arrays are module-level and reused via a generation stamp, so
  a search allocates nothing and 20 searches a turn stay cheap.
- **Path cache per monster**: each monster stores the path it computed and the
  player position it was computed for. If the player hasn't moved since, the
  monster reuses the cached path (popping the next step) instead of re-searching.
  Cache is invalidated when the player moves, when the next cached step is blocked,
  or when the monster is confused.

**Rejected alternatives.**

- *Dijkstra / Brush-fire "influence map" from the player* (one BFS per turn,
  every monster reads the gradient). Elegant and O(1) per monster, and a common
  roguelike technique. Rejected *for now* because it's a bigger structural change
  (a shared distance field recomputed each player move) and the task asked
  specifically for A* pathfinding. Noted as the better approach if monster counts
  or CPU ever become a real problem — revisit then.
- *8-directional A*.* See above; rejected to keep corridor movement clean and the
  heuristic simple. Low-cost to switch later.
- *No budget, rely on small map.* Rejected — 20 visible monsters × full searches
  every turn is the exact stall the task warned about; the cache + node cap keep
  worst case bounded.
