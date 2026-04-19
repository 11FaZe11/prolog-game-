/**
 * AlchemyEngine — pure JavaScript recipe lookup.
 *
 * This used to be a Tau Prolog wrapper. That approach kept hitting two walls:
 *   1. The npm package bundles Node-only `require("fs")` / `child_process`
 *      branches that Next/Turbopack can't resolve for the browser.
 *   2. The browser build on CDN isn't reachable from the preview sandbox,
 *      causing "Tau Prolog failed to load" runtime errors.
 *
 * Since the game only ever needs a symmetric (A, B) -> R lookup, we now
 * delegate directly to `lib/recipes.ts`. The class shape is preserved so the
 * React layer (alchemy-game.tsx) doesn't need to change its call sites.
 */

import { combineElements } from "./recipes"

export class AlchemyEngine {
  /**
   * Look up the combination of two elements. Returns the resulting element
   * atom or null when no recipe exists.
   */
  async combine(a: string, b: string): Promise<string | null> {
    // Microtask to stay async-shaped — canvas code awaits this.
    return combineElements(a, b)
  }
}

/** Process-wide singleton so every component talks to the same engine. */
let engineSingleton: AlchemyEngine | null = null
export function getEngine(): AlchemyEngine {
  if (!engineSingleton) engineSingleton = new AlchemyEngine()
  return engineSingleton
}
