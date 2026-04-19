"use client"

import { useMemo, useState } from "react"
import { Search, Sparkles } from "lucide-react"

import { ElementToken } from "./element-token"
import { cn } from "@/lib/utils"
import { ELEMENTS } from "@/lib/recipes"

/**
 * Scrollable strip of every element the player has discovered.
 * Clicking/tapping an element spawns a fresh instance on the canvas.
 *
 * On mobile we lean into a horizontally-scrolling strip with larger touch
 * targets; on desktop the same layout compresses horizontally and the
 * search box is always visible.
 */
export function InventoryPanel({
  elements,
  recentlyDiscovered,
  onSpawn,
}: {
  elements: string[]
  recentlyDiscovered: string | null
  /** Add a fresh instance of this element to the canvas. */
  onSpawn: (name: string) => void
}) {
  const [q, setQ] = useState("")

  // Sort by tier, then alphabetically — starters first, then progression.
  const sorted = useMemo(() => {
    return [...elements].sort((a, b) => {
      const ta = ELEMENTS[a]?.tier ?? 99
      const tb = ELEMENTS[b]?.tier ?? 99
      if (ta !== tb) return ta - tb
      return a.localeCompare(b)
    })
  }, [elements])

  const filtered = useMemo(() => {
    if (!q.trim()) return sorted
    const needle = q.trim().toLowerCase()
    return sorted.filter((n) => n.toLowerCase().includes(needle))
  }, [sorted, q])

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-sidebar">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2.5 md:px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Inventory
          </h2>
          <span className="font-mono text-xs text-muted-foreground/60">
            {elements.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden font-mono text-[11px] text-muted-foreground/70 md:block">
            <span>tap to place</span>
            <span aria-hidden className="mx-1.5 opacity-50">
              {"//"}
            </span>
            <span>drag onto another to combine</span>
          </p>
          <label className="flex items-center gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1">
            <Search
              className="h-3 w-3 text-muted-foreground/70"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className={cn(
                "w-24 bg-transparent font-mono text-[11px] text-foreground",
                "placeholder:text-muted-foreground/50 focus:outline-none",
                "md:w-28",
              )}
              aria-label="Search inventory"
            />
          </label>
        </div>
      </div>

      {/* Horizontally-scrolling element strip. Each token is at least 56px
          square on touch devices so the tap target meets the 44×44 guideline. */}
      <div
        className={cn(
          "terminal-scroll flex gap-2 overflow-x-auto px-3 pb-3 md:gap-3 md:px-4 md:pb-4",
        )}
      >
        {filtered.length === 0 ? (
          <p className="py-4 font-mono text-xs text-muted-foreground/70">
            nothing matches &quot;{q}&quot;
          </p>
        ) : (
          filtered.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onSpawn(name)}
              className={cn(
                "shrink-0 rounded-lg p-1.5 transition-all duration-150",
                "hover:bg-secondary/60 active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                recentlyDiscovered === name &&
                  "alch-discover bg-primary/10 ring-1 ring-primary/40",
              )}
              aria-label={`Place ${name} on the canvas`}
            >
              <ElementToken name={name} size="sm" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
