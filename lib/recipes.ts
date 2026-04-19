/**
 * recipes.ts — the pure-JS alchemy knowledge base.
 *
 * We used to drive combinations through Tau Prolog running in the browser.
 * That relied on CDN-delivered scripts that can't reach the Next.js
 * development sandbox, which meant every combine() call failed. The recipe
 * graph itself is a symmetric pairwise lookup, so this module now owns
 * the KB and the query engine (lib/prolog-engine.ts) runs queries against
 * the same exports.
 *
 * This module ships:
 *   - ELEMENTS       : metadata for every element (category, tier)
 *   - CATEGORIES     : enumeration of categories (used by the Prolog engine)
 *   - RECIPES        : canonical symmetric (a, b) -> r table
 *   - STARTER_ELEMENTS / TOTAL_ELEMENTS for progress display
 *   - combineElements(a, b) / getHints(name) helpers
 *
 * Recipes are symmetric: combineElements("water","fire") is identical to
 * combineElements("fire","water"). The lookup table is pre-built both ways.
 */

export type ElementCategory =
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "plant"
  | "life"
  | "material"
  | "cold"
  | "special"

export type ElementMeta = {
  name: string
  category: ElementCategory
  /** 0 for starters, higher = later discovery tier */
  tier: number
}

/**
 * Element catalog. Every element the engine can produce must appear here
 * so the UI can render a consistent token for it.
 *
 * NOTE: this is maintained manually rather than derived from RECIPES so we
 * can tune category/tier independently of the recipe graph.
 */
const ELEMENT_LIST: ElementMeta[] = [
  // ═════════════════════════════════════════════════════════════
  // TIER 0 — starters
  // ═════════════════════════════════════════════════════════════
  { name: "water", category: "water", tier: 0 },
  { name: "fire", category: "fire", tier: 0 },
  { name: "earth", category: "earth", tier: 0 },
  { name: "air", category: "air", tier: 0 },

  // ═════════════════════════════════════════════════════════════
  // TIER 1 — primary combinations + doubles
  // ═════════════════════════════════════════════════════════════
  { name: "steam", category: "air", tier: 1 },
  { name: "mud", category: "earth", tier: 1 },
  { name: "rain", category: "water", tier: 1 },
  { name: "lava", category: "fire", tier: 1 },
  { name: "energy", category: "special", tier: 1 },
  { name: "dust", category: "earth", tier: 1 },
  { name: "lake", category: "water", tier: 1 },
  { name: "land", category: "earth", tier: 1 },
  { name: "sun", category: "fire", tier: 1 },
  { name: "pressure", category: "air", tier: 1 },

  // ═════════════════════════════════════════════════════════════
  // TIER 2 — weather, landscape, materials
  // ═════════════════════════════════════════════════════════════
  { name: "sea", category: "water", tier: 2 },
  { name: "continent", category: "earth", tier: 2 },
  { name: "wind", category: "air", tier: 2 },
  { name: "stone", category: "earth", tier: 2 },
  { name: "cloud", category: "air", tier: 2 },
  { name: "brick", category: "material", tier: 2 },
  { name: "clay", category: "earth", tier: 2 },
  { name: "plant", category: "plant", tier: 2 },
  { name: "volcano", category: "fire", tier: 2 },
  { name: "gunpowder", category: "material", tier: 2 },
  { name: "ice", category: "cold", tier: 2 },
  { name: "rainbow", category: "special", tier: 2 },
  { name: "soil", category: "earth", tier: 2 },
  { name: "day", category: "fire", tier: 2 },
  { name: "dew", category: "water", tier: 2 },
  { name: "mist", category: "air", tier: 2 },
  { name: "desert", category: "earth", tier: 2 },

  // ═════════════════════════════════════════════════════════════
  // TIER 3 — deeper landscape, time, basic life
  // ═════════════════════════════════════════════════════════════
  { name: "ocean", category: "water", tier: 3 },
  { name: "planet", category: "earth", tier: 3 },
  { name: "storm", category: "air", tier: 3 },
  { name: "sky", category: "air", tier: 3 },
  { name: "metal", category: "material", tier: 3 },
  { name: "sand", category: "earth", tier: 3 },
  { name: "tree", category: "plant", tier: 3 },
  { name: "grass", category: "plant", tier: 3 },
  { name: "ash", category: "earth", tier: 3 },
  { name: "algae", category: "plant", tier: 3 },
  { name: "sugar", category: "plant", tier: 3 },
  { name: "glacier", category: "cold", tier: 3 },
  { name: "horizon", category: "special", tier: 3 },
  { name: "night", category: "special", tier: 3 },
  { name: "moon", category: "special", tier: 3 },
  { name: "star", category: "special", tier: 3 },
  { name: "flower", category: "plant", tier: 3 },
  { name: "seed", category: "plant", tier: 3 },
  { name: "bacteria", category: "life", tier: 3 },
  { name: "moss", category: "plant", tier: 3 },
  { name: "mushroom", category: "plant", tier: 3 },

  // ═════════════════════════════════════════════════════════════
  // TIER 4 — materials, life, weather
  // ═════════════════════════════════════════════════════════════
  { name: "glass", category: "material", tier: 4 },
  { name: "beach", category: "earth", tier: 4 },
  { name: "steel", category: "material", tier: 4 },
  { name: "rust", category: "material", tier: 4 },
  { name: "gold", category: "material", tier: 4 },
  { name: "silver", category: "material", tier: 4 },
  { name: "electricity", category: "special", tier: 4 },
  { name: "lightning", category: "special", tier: 4 },
  { name: "blade", category: "material", tier: 4 },
  { name: "wood", category: "plant", tier: 4 },
  { name: "forest", category: "plant", tier: 4 },
  { name: "field", category: "plant", tier: 4 },
  { name: "life", category: "life", tier: 4 },
  { name: "smoke", category: "air", tier: 4 },
  { name: "iceberg", category: "cold", tier: 4 },
  { name: "wave", category: "water", tier: 4 },
  { name: "oil", category: "material", tier: 4 },
  { name: "fruit", category: "plant", tier: 4 },
  { name: "wheat", category: "plant", tier: 4 },
  { name: "garden", category: "plant", tier: 4 },

  // ══════════════════════════════════════���══════════════════════
  // TIER 5 — creatures, tools, natural disasters
  // ═════════════════════════════════════════════════════════════
  { name: "lens", category: "material", tier: 5 },
  { name: "sword", category: "material", tier: 5 },
  { name: "human", category: "life", tier: 5 },
  { name: "animal", category: "life", tier: 5 },
  { name: "plankton", category: "life", tier: 5 },
  { name: "tornado", category: "air", tier: 5 },
  { name: "tsunami", category: "water", tier: 5 },
  { name: "smog", category: "air", tier: 5 },
  { name: "syrup", category: "plant", tier: 5 },
  { name: "wildfire", category: "fire", tier: 5 },
  { name: "island", category: "earth", tier: 5 },
  { name: "paper", category: "material", tier: 5 },
  { name: "fabric", category: "material", tier: 5 },
  { name: "rope", category: "material", tier: 5 },
  { name: "gasoline", category: "material", tier: 5 },
  { name: "egg", category: "life", tier: 5 },
  { name: "flour", category: "plant", tier: 5 },
  { name: "coconut", category: "plant", tier: 5 },
  { name: "coal", category: "material", tier: 5 },

  // ═════════════════════════════════════════════════════════════
  // TIER 6 — specific creatures, human pros, food basics
  // ═════════════════════════════════════════════════════════════
  { name: "telescope", category: "material", tier: 6 },
  { name: "robot", category: "life", tier: 6 },
  { name: "tool", category: "material", tier: 6 },
  { name: "farmer", category: "life", tier: 6 },
  { name: "fisher", category: "life", tier: 6 },
  { name: "campfire", category: "fire", tier: 6 },
  { name: "family", category: "life", tier: 6 },
  { name: "horse", category: "life", tier: 6 },
  { name: "fish", category: "life", tier: 6 },
  { name: "bird", category: "life", tier: 6 },
  { name: "whale", category: "life", tier: 6 },
  { name: "honey", category: "plant", tier: 6 },
  { name: "wire", category: "material", tier: 6 },
  { name: "dog", category: "life", tier: 6 },
  { name: "cat", category: "life", tier: 6 },
  { name: "mouse", category: "life", tier: 6 },
  { name: "cow", category: "life", tier: 6 },
  { name: "bee", category: "life", tier: 6 },
  { name: "dragon", category: "life", tier: 6 },
  { name: "milk", category: "plant", tier: 6 },
  { name: "bread", category: "plant", tier: 6 },
  { name: "book", category: "material", tier: 6 },
  { name: "wheel", category: "material", tier: 6 },

  // ═════════════════════════════════════════════════════════════
  // TIER 7 — settlements, machines, food & drink
  // ═════════════════════════════════════════════════════════════
  { name: "axe", category: "material", tier: 7 },
  { name: "knight", category: "life", tier: 7 },
  { name: "pet", category: "life", tier: 7 },
  { name: "sailor", category: "life", tier: 7 },
  { name: "village", category: "life", tier: 7 },
  { name: "wall", category: "material", tier: 7 },
  { name: "soul", category: "special", tier: 7 },
  { name: "circuit", category: "material", tier: 7 },
  { name: "shark", category: "life", tier: 7 },
  { name: "dolphin", category: "life", tier: 7 },
  { name: "eagle", category: "life", tier: 7 },
  { name: "chicken", category: "life", tier: 7 },
  { name: "sheep", category: "life", tier: 7 },
  { name: "wine", category: "plant", tier: 7 },
  { name: "beer", category: "plant", tier: 7 },
  { name: "cheese", category: "plant", tier: 7 },
  { name: "cart", category: "material", tier: 7 },
  { name: "library", category: "material", tier: 7 },
  { name: "music", category: "special", tier: 7 },
  { name: "boat", category: "material", tier: 7 },

  // ═════════════════════════════════════════════════════════════
  // TIER 8 — civilization, vehicles, wonders
  // ═════════════════════════════════════════════════════════════
  { name: "hero", category: "life", tier: 8 },
  { name: "city", category: "life", tier: 8 },
  { name: "house", category: "material", tier: 8 },
  { name: "pirate", category: "life", tier: 8 },
  { name: "computer", category: "material", tier: 8 },
  { name: "car", category: "material", tier: 8 },
  { name: "ship", category: "material", tier: 8 },
  { name: "plane", category: "material", tier: 8 },
  { name: "rocket", category: "material", tier: 8 },
  { name: "tower", category: "material", tier: 8 },
  { name: "castle", category: "material", tier: 8 },
  { name: "farm", category: "life", tier: 8 },
  { name: "engine", category: "material", tier: 8 },
  { name: "factory", category: "material", tier: 8 },
  { name: "phoenix", category: "life", tier: 8 },

  // ═════════════════════════════════════════════════════════════
  // TIER 9 — modern life, mythology, professions
  // ═════════════════════════════════════════════════════════════
  { name: "country", category: "life", tier: 9 },
  { name: "programmer", category: "life", tier: 9 },
  { name: "astronaut", category: "life", tier: 9 },
  { name: "scientist", category: "life", tier: 9 },
  { name: "wizard", category: "life", tier: 9 },
  { name: "god", category: "special", tier: 9 },
  { name: "angel", category: "special", tier: 9 },
  { name: "demon", category: "special", tier: 9 },
  { name: "ghost", category: "special", tier: 9 },
  { name: "vampire", category: "life", tier: 9 },
  { name: "werewolf", category: "life", tier: 9 },
  { name: "unicorn", category: "life", tier: 9 },
  { name: "mermaid", category: "life", tier: 9 },
  { name: "fairy", category: "life", tier: 9 },

  // ═════════════════════════════════════════════════════════════
  // TIER 10+ — space, internet, the world
  // ═════════════════════════════════════════════════════════════
  { name: "world", category: "earth", tier: 10 },
  { name: "internet", category: "material", tier: 10 },
  { name: "galaxy", category: "special", tier: 10 },
  { name: "universe", category: "special", tier: 11 },
  { name: "time", category: "special", tier: 11 },
  { name: "space", category: "special", tier: 10 },
  { name: "sun_system", category: "special", tier: 10 },
  { name: "black_hole", category: "special", tier: 12 },
]

export const ELEMENTS: Record<string, ElementMeta> = Object.fromEntries(
  ELEMENT_LIST.map((e) => [e.name, e]),
)

/** Enumeration of all category strings, used by the Prolog engine. */
export const CATEGORIES: ElementCategory[] = [
  "water",
  "fire",
  "earth",
  "air",
  "plant",
  "life",
  "material",
  "cold",
  "special",
]

/**
 * Recipe table. Each entry is [ingredientA, ingredientB, result].
 * Order of ingredients does not matter — the engine builds a symmetric map.
 *
 * Any element referenced here MUST also appear in ELEMENT_LIST above.
 *
 * Loosely inspired by Little Alchemy 2 but not a direct copy: the graph is
 * tuned so every element is reachable from the four starters and most
 * tiers have several entry points.
 */
const RAW_RECIPES: ReadonlyArray<readonly [string, string, string]> = [
  // ──────────── T0 → T1 ────────────
  ["water", "water", "lake"],
  ["earth", "earth", "land"],
  ["fire", "fire", "sun"],
  ["air", "air", "pressure"],
  ["water", "fire", "steam"],
  ["water", "earth", "mud"],
  ["water", "air", "rain"],
  ["earth", "fire", "lava"],
  ["fire", "air", "energy"],
  ["earth", "air", "dust"],

  // ──────────── T1 → T2 ────────────
  ["lake", "lake", "sea"],
  ["land", "land", "continent"],
  ["air", "pressure", "wind"],
  ["earth", "pressure", "stone"],
  ["steam", "air", "cloud"],
  ["mud", "fire", "brick"],
  ["mud", "stone", "clay"],
  ["rain", "earth", "plant"],
  ["lava", "earth", "volcano"],
  ["lava", "water", "stone"],
  ["dust", "fire", "gunpowder"],
  ["water", "pressure", "ice"],
  ["sun", "water", "rainbow"],
  ["sun", "earth", "soil"],
  ["sun", "air", "day"],
  ["rain", "air", "mist"],
  ["mist", "earth", "dew"],
  ["sand", "land", "desert"],
  ["sun", "sand", "desert"],

  // ──────────── T2 → T3 ────────────
  ["sea", "sea", "ocean"],
  ["continent", "continent", "planet"],
  ["cloud", "cloud", "storm"],
  ["cloud", "air", "sky"],
  ["stone", "fire", "metal"],
  ["stone", "air", "sand"],
  ["plant", "plant", "tree"],
  ["plant", "earth", "grass"],
  ["plant", "fire", "ash"],
  ["plant", "water", "algae"],
  ["plant", "sun", "sugar"],
  ["ice", "ice", "glacier"],
  ["sky", "earth", "horizon"],
  ["day", "day", "night"],
  ["night", "sky", "moon"],
  ["sun", "night", "star"],
  ["plant", "air", "seed"],
  ["plant", "mud", "moss"],
  ["plant", "soil", "flower"],
  ["water", "life", "bacteria"],
  ["earth", "moss", "mushroom"],

  // ──────────── T3 → T4 ────────────
  ["sand", "fire", "glass"],
  ["sand", "sea", "beach"],
  ["metal", "fire", "steel"],
  ["metal", "water", "rust"],
  ["metal", "energy", "electricity"],
  ["metal", "stone", "blade"],
  ["tree", "fire", "wood"],
  ["tree", "tree", "forest"],
  ["grass", "earth", "field"],
  ["energy", "water", "life"],
  ["wood", "fire", "smoke"],
  ["glacier", "water", "iceberg"],
  ["wind", "water", "wave"],
  ["storm", "earth", "lightning"],
  ["stone", "energy", "gold"],
  ["stone", "moon", "silver"],
  ["flower", "flower", "garden"],
  ["tree", "sugar", "fruit"],
  ["seed", "field", "wheat"],
  ["rain", "ocean", "oil"],

  // ──────────── T4 → T5 ────────────
  ["glass", "fire", "lens"],
  ["blade", "wood", "sword"],
  ["life", "earth", "human"],
  ["life", "forest", "animal"],
  ["bacteria", "ocean", "plankton"],
  ["storm", "storm", "tornado"],
  ["wave", "ocean", "tsunami"],
  ["smoke", "cloud", "smog"],
  ["sugar", "water", "syrup"],
  ["forest", "fire", "wildfire"],
  ["volcano", "ocean", "island"],
  ["lightning", "metal", "electricity"],
  ["wood", "wood", "paper"],
  ["wood", "tree", "paper"],
  ["wheat", "stone", "flour"],
  ["fabric", "fabric", "rope"],
  ["plant", "tool", "fabric"],
  ["oil", "fire", "gasoline"],
  ["oil", "earth", "coal"],
  ["life", "stone", "egg"],
  ["tree", "beach", "coconut"],

  // ──────────── T5 → T6 ────────────
  ["lens", "lens", "telescope"],
  ["metal", "life", "robot"],
  ["human", "metal", "tool"],
  ["human", "plant", "farmer"],
  ["human", "water", "fisher"],
  ["human", "fire", "campfire"],
  ["human", "life", "family"],
  ["animal", "earth", "horse"],
  ["animal", "water", "fish"],
  ["animal", "sky", "bird"],
  ["plankton", "ocean", "whale"],
  ["syrup", "sun", "honey"],
  ["electricity", "metal", "wire"],
  ["animal", "human", "pet"],
  ["human", "animal", "pet"],
  ["animal", "forest", "dog"],
  ["animal", "desert", "cat"],
  ["animal", "field", "mouse"],
  ["animal", "grass", "cow"],
  ["animal", "flower", "bee"],
  ["egg", "fire", "dragon"],
  ["cow", "human", "milk"],
  ["flour", "fire", "bread"],
  ["paper", "paper", "book"],
  ["stone", "wood", "wheel"],

  // ──────────── T6 → T7 ────────────
  ["tool", "stone", "axe"],
  ["horse", "human", "knight"],
  ["human", "ocean", "sailor"],
  ["family", "family", "village"],
  ["brick", "brick", "wall"],
  ["life", "energy", "soul"],
  ["wire", "energy", "circuit"],
  ["fish", "metal", "shark"],
  ["fish", "human", "dolphin"],
  ["bird", "sky", "eagle"],
  ["bird", "farm", "chicken"],
  ["bird", "grass", "chicken"],
  ["animal", "cloud", "sheep"],
  ["fruit", "time", "wine"],
  ["wheat", "water", "beer"],
  ["milk", "bacteria", "cheese"],
  ["wheel", "wood", "cart"],
  ["book", "book", "library"],
  ["wind", "bird", "music"],
  ["wood", "water", "boat"],

  // ──────────── T7 → T8 ────────────
  ["knight", "sword", "hero"],
  ["village", "village", "city"],
  ["wall", "wall", "house"],
  ["sailor", "ocean", "pirate"],
  ["circuit", "metal", "computer"],
  ["cart", "engine", "car"],
  ["wheel", "engine", "car"],
  ["boat", "metal", "ship"],
  ["bird", "metal", "plane"],
  ["ship", "fire", "rocket"],
  ["wall", "house", "tower"],
  ["wall", "knight", "castle"],
  ["house", "house", "castle"],
  ["farmer", "field", "farm"],
  ["metal", "wheel", "engine"],
  ["engine", "wall", "factory"],
  ["bird", "wildfire", "phoenix"],

  // ──────────── T8 → T9 ────────────
  ["city", "city", "country"],
  ["computer", "human", "programmer"],
  ["rocket", "human", "astronaut"],
  ["human", "tool", "scientist"],
  ["human", "book", "scientist"],
  ["human", "soul", "wizard"],
  ["soul", "soul", "god"],
  ["angel", "soul", "god"],
  ["soul", "sky", "angel"],
  ["soul", "fire", "demon"],
  ["soul", "night", "ghost"],
  ["human", "night", "vampire"],
  ["human", "moon", "werewolf"],
  ["horse", "soul", "unicorn"],
  ["soul", "fish", "mermaid"],
  ["human", "flower", "fairy"],

  // ──────────── T9 → T10+ ────────────
  ["country", "country", "world"],
  ["computer", "computer", "internet"],
  ["planet", "planet", "sun_system"],
  ["sun_system", "sun_system", "galaxy"],
  ["galaxy", "galaxy", "universe"],
  ["rocket", "sky", "space"],
  ["space", "space", "time"],
  ["star", "star", "galaxy"],
  ["universe", "star", "black_hole"],
]

/* -------------------------------------------------------------------------
 * Symmetric recipe map.
 *
 * Keyed by "a|b" with the pair sorted alphabetically so lookup is O(1) and
 * order-independent. Built once at module load.
 * ------------------------------------------------------------------------- */

const recipeKey = (a: string, b: string) =>
  a < b ? `${a}|${b}` : `${b}|${a}`

// De-duplicate recipes that share the same LHS but happen to repeat in the
// list (e.g. two "bird + sky" entries). Last writer wins, but we warn in
// dev if the winner disagrees with an earlier entry.
const RECIPE_MAP = new Map<string, string>()
for (const [a, b, r] of RAW_RECIPES) {
  const k = recipeKey(a, b)
  const prev = RECIPE_MAP.get(k)
  if (prev && prev !== r && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      `[v0] Conflicting recipe for ${a} + ${b}: ${prev} vs ${r}. Using ${r}.`,
    )
  }
  RECIPE_MAP.set(k, r)
}

// Sanity check: every element referenced in a recipe must be in ELEMENTS.
if (process.env.NODE_ENV !== "production") {
  for (const [a, b, r] of RAW_RECIPES) {
    for (const el of [a, b, r]) {
      if (!ELEMENTS[el]) {
        // eslint-disable-next-line no-console
        console.warn(`[v0] Recipe references unknown element: ${el}`)
      }
    }
  }
}

export const STARTER_ELEMENTS = ["water", "fire", "earth", "air"] as const

export const TOTAL_ELEMENTS = ELEMENT_LIST.length

/** Pure lookup: symmetric, returns the resulting element name or null. */
export function combineElements(a: string, b: string): string | null {
  return RECIPE_MAP.get(recipeKey(a, b)) ?? null
}

/**
 * Return every recipe that uses `name` as an ingredient OR as the result.
 * Used by the Codex panel to show hints for a selected element.
 */
export type Hint = { a: string; b: string; result: string }
export function getHints(name: string): Hint[] {
  const hints: Hint[] = []
  const seen = new Set<string>()
  for (const [a, b, r] of RAW_RECIPES) {
    if (a === name || b === name || r === name) {
      // Dedup by (a|b) key since the raw list may have merged duplicates.
      const k = `${recipeKey(a, b)}|${r}`
      if (seen.has(k)) continue
      seen.add(k)
      hints.push({ a, b, result: r })
    }
  }
  return hints
}

/** Every recipe as readable triples, mostly for the Codex "all recipes" view. */
export function allRecipes(): Hint[] {
  const out: Hint[] = []
  const seen = new Set<string>()
  for (const [a, b, r] of RAW_RECIPES) {
    const k = `${recipeKey(a, b)}|${r}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ a, b, result: r })
  }
  return out
}

/** Every element name — used by the Prolog engine for `element(X)` queries. */
export function allElementNames(): string[] {
  return ELEMENT_LIST.map((e) => e.name)
}
