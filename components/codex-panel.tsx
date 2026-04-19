"use client"

import { useMemo, useState } from "react"
import { BookOpen, Lightbulb, RotateCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ElementToken } from "./element-token"
import { PrologDocs } from "./prolog-docs"
import { PrologTerminal } from "./prolog-terminal"
import {
  allRecipes,
  ELEMENTS,
  getHints,
  TOTAL_ELEMENTS,
  type Hint,
} from "@/lib/recipes"

export type DiscoveryEntry = {
  id: number
  a: string
  b: string
  result: string
  fresh: boolean
}

/**
 * Right-hand sidebar. Replaces the old Prolog terminal with a proper
 * "codex" for a Little-Alchemy-2-style game:
 *
 *   - Progress meter (discovered / total)
 *   - Tabs:
 *       · Log     — rolling history of successful combinations
 *       · Recipes — searchable list. Shows full recipe for elements the
 *                   player has already discovered, and a locked hint
 *                   (???) for anything still undiscovered, so the codex
 *                   doubles as a spoiler-light hint system.
 *       · Hints   — click any owned element to see every recipe it
 *                   participates in.
 *   - Reset button to wipe progress
 */
export function CodexPanel({
  discovered,
  log,
  onReset,
}: {
  discovered: Set<string>
  log: DiscoveryEntry[]
  onReset: () => void
}) {
  const [tab, setTab] = useState<
    "log" | "recipes" | "hints" | "prolog" | "docs"
  >("log")

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-border bg-sidebar">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-mono text-sm font-medium">codex</h2>
        </div>
        <div className="flex items-center gap-3">
          <ProgressMeter
            count={discovered.size}
            total={TOTAL_ELEMENTS}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            className="h-7 gap-1.5 font-mono text-xs"
            title="Reset progress"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            reset
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        className="flex border-b border-border bg-background/40"
      >
        <TabButton
          active={tab === "log"}
          onClick={() => setTab("log")}
          label="log"
          count={log.length}
        />
        <TabButton
          active={tab === "recipes"}
          onClick={() => setTab("recipes")}
          label="recipes"
        />
        <TabButton
          active={tab === "hints"}
          onClick={() => setTab("hints")}
          label="hints"
        />
        <TabButton
          active={tab === "prolog"}
          onClick={() => setTab("prolog")}
          label="prolog"
        />
        <TabButton
          active={tab === "docs"}
          onClick={() => setTab("docs")}
          label="docs"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "log" && <LogTab log={log} />}
        {tab === "recipes" && <RecipesTab discovered={discovered} />}
        {tab === "hints" && <HintsTab discovered={discovered} />}
        {tab === "prolog" && <PrologTerminal discovered={discovered} />}
        {tab === "docs" && <PrologDocs />}
      </div>
    </aside>
  )
}

/* -------------------------------------------------------------------------
 * Progress meter
 * ------------------------------------------------------------------------- */

function ProgressMeter({ count, total }: { count: number; total: number }) {
  const pct = Math.min(100, Math.round((count / total) * 100))
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={count}
        aria-label="Discovery progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        {count}
        <span className="text-muted-foreground/50">{"/"}</span>
        {total}
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------------
 * Tabs
 * ------------------------------------------------------------------------- */

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
}) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex-1 border-b-2 px-2 py-2 font-mono text-[11px] transition-colors",
        "sm:text-xs",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {typeof count === "number" && (
        <span className="ml-1.5 text-muted-foreground/60">{count}</span>
      )}
    </button>
  )
}

function LogTab({ log }: { log: DiscoveryEntry[] }) {
  if (log.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
        <div>
          <p className="font-mono text-sm text-muted-foreground">
            No combinations yet.
          </p>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted-foreground/70">
            Every successful merge will appear here, newest first. Look for the
            glowing <span className="text-primary">new!</span> tag to spot
            first-time discoveries.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ol className="terminal-scroll min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
      {[...log].reverse().map((entry) => (
        <li
          key={entry.id}
          className="alch-fade-in flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-xs hover:bg-secondary/40"
        >
          <span className="text-muted-foreground">{entry.a}</span>
          <span className="text-muted-foreground/50">{"+"}</span>
          <span className="text-muted-foreground">{entry.b}</span>
          <span className="text-muted-foreground/50">{"→"}</span>
          <span className="font-semibold text-foreground">{entry.result}</span>
          {entry.fresh && (
            <span className="ml-auto rounded-sm bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              new
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

function RecipesTab({ discovered }: { discovered: Set<string> }) {
  const [q, setQ] = useState("")
  const [showLocked, setShowLocked] = useState(true)

  const recipes = useMemo(() => allRecipes(), [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return recipes.filter((r) => {
      const unlocked =
        discovered.has(r.a) && discovered.has(r.b) && discovered.has(r.result)
      if (!showLocked && !unlocked) return false
      if (!needle) return true
      return (
        r.a.includes(needle) ||
        r.b.includes(needle) ||
        r.result.includes(needle)
      )
    })
  }, [recipes, discovered, q, showLocked])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <label className="flex flex-1 items-center gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1">
          <Search className="h-3 w-3 text-muted-foreground/70" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search recipes"
            spellCheck={false}
            className="flex-1 bg-transparent font-mono text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            aria-label="Search recipes"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowLocked((v) => !v)}
          className={cn(
            "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
            showLocked
              ? "border-border text-muted-foreground hover:bg-secondary/40"
              : "border-primary/60 text-primary hover:bg-primary/10",
          )}
        >
          {showLocked ? "hide locked" : "show locked"}
        </button>
      </div>
      <ul className="terminal-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {filtered.map((r, i) => (
          <RecipeRow key={i} recipe={r} discovered={discovered} />
        ))}
        {filtered.length === 0 && (
          <li className="py-6 text-center font-mono text-xs text-muted-foreground/70">
            no recipes match
          </li>
        )}
      </ul>
    </div>
  )
}

function RecipeRow({
  recipe,
  discovered,
}: {
  recipe: Hint
  discovered: Set<string>
}) {
  const ownA = discovered.has(recipe.a)
  const ownB = discovered.has(recipe.b)
  const ownR = discovered.has(recipe.result)
  const fullyOwned = ownA && ownB && ownR

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[12px]",
        "hover:bg-secondary/40",
        !fullyOwned && "opacity-70",
      )}
    >
      <RecipeAtom name={recipe.a} known={ownA} />
      <span className="text-muted-foreground/50">{"+"}</span>
      <RecipeAtom name={recipe.b} known={ownB} />
      <span className="text-muted-foreground/50">{"→"}</span>
      <RecipeAtom name={recipe.result} known={ownR} emphasize />
    </li>
  )
}

function RecipeAtom({
  name,
  known,
  emphasize = false,
}: {
  name: string
  known: boolean
  emphasize?: boolean
}) {
  if (!known) {
    return (
      <span className="text-muted-foreground/50">{"???"}</span>
    )
  }
  return (
    <span
      className={cn(
        emphasize ? "font-semibold text-foreground" : "text-foreground/90",
      )}
    >
      {name}
    </span>
  )
}

function HintsTab({ discovered }: { discovered: Set<string> }) {
  const [selected, setSelected] = useState<string | null>(null)
  const owned = useMemo(
    () =>
      [...discovered].sort((a, b) => {
        const ta = ELEMENTS[a]?.tier ?? 99
        const tb = ELEMENTS[b]?.tier ?? 99
        if (ta !== tb) return ta - tb
        return a.localeCompare(b)
      }),
    [discovered],
  )

  const hints = selected ? getHints(selected) : []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Lightbulb className="h-3.5 w-3.5 text-primary" aria-hidden />
        <p className="font-mono text-[11px] text-muted-foreground">
          {selected
            ? `recipes involving ${selected}`
            : "pick an element to see every recipe it appears in"}
        </p>
      </div>

      <div className="terminal-scroll flex gap-2 overflow-x-auto border-b border-border px-3 py-2">
        {owned.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() =>
              setSelected((cur) => (cur === name ? null : name))
            }
            className={cn(
              "shrink-0 rounded-md p-1.5 transition-colors",
              "hover:bg-secondary/60",
              selected === name && "bg-primary/10 ring-1 ring-primary/50",
            )}
            aria-pressed={selected === name}
            aria-label={`Show hints for ${name}`}
          >
            <ElementToken name={name} size="sm" />
          </button>
        ))}
      </div>

      <ul className="terminal-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {selected === null && (
          <li className="py-6 text-center font-mono text-xs text-muted-foreground/70">
            nothing selected
          </li>
        )}
        {selected !== null &&
          hints.map((h, i) => (
            <RecipeRow key={i} recipe={h} discovered={discovered} />
          ))}
        {selected !== null && hints.length === 0 && (
          <li className="py-6 text-center font-mono text-xs text-muted-foreground/70">
            no recipes involve {selected}
          </li>
        )}
      </ul>
    </div>
  )
}
