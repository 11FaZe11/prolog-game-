"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Circle, Terminal, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  BUILTIN_PREDICATES,
  buildKB,
  parseQuery,
  PrologParseError,
  runQuery,
  type Solution,
} from "@/lib/prolog-engine"

/* ═════════════════════════════════════════════════════════════════════════
 * Types
 * ═════════════════════════════════════════════════════════════════════════
 */

type Line =
  | { kind: "banner"; text: string }
  | { kind: "query"; text: string }
  | { kind: "ok"; text: string }
  | { kind: "bindings"; solutions: Solution[]; truncated: boolean }
  | { kind: "info"; text: string }
  | { kind: "event"; text: string }
  | { kind: "error"; text: string }

/* ═════════════════════════════════════════════════════════════════════════
 * Initial banner
 * ═════════════════════════════════════════════════════════════════════════
 */

const BANNER =
  "alchemy-prolog 1.0  ·  type help. for commands  ·  queries end with ."

const SAMPLES = [
  "combine(water, fire, X).",
  "combine(X, Y, steam).",
  "element(X), tier(X, 3).",
  "category(X, life), discovered(X).",
  "recipe(A, B, dragon).",
]

/* ═════════════════════════════════════════════════════════════════════════
 * Terminal
 *
 * A fully-functional Prolog-style REPL backed by lib/prolog-engine.
 *
 * Live sync:
 *   The KB is rebuilt from `discovered` on every query, and we also
 *   *push* event lines into the scrollback whenever the set grows
 *   (a new element was combined in the game). That way the terminal
 *   reads like a live trace of the expert system learning new facts —
 *   no refresh, no re-run needed.
 *
 * Keyboard:
 *   Enter         submit
 *   Up / Down     navigate command history
 * ═════════════════════════════════════════════════════════════════════════
 */

export function PrologTerminal({
  discovered,
}: {
  discovered: Set<string>
}) {
  const [lines, setLines] = useState<Line[]>([
    { kind: "banner", text: BANNER },
    {
      kind: "info",
      text: "Try: " + SAMPLES[0],
    },
  ])
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState<number | null>(null)
  // Flipped for ~900 ms whenever the KB changes, so the header can pulse.
  const [pulse, setPulse] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* -------------------------------------------------------------------
   * Watch `discovered` for changes and append live event lines.
   *
   * We keep a ref of the previously-seen names so we can diff precisely
   * and log each new element by name (not just "size changed"). On
   * reset/shrink we just re-sync the ref silently.
   * ------------------------------------------------------------------- */
  const prevRef = useRef<Set<string> | null>(null)
  useEffect(() => {
    const prev = prevRef.current
    if (prev === null) {
      prevRef.current = new Set(discovered)
      return
    }
    // Find the names added since last render.
    const added: string[] = []
    for (const name of discovered) if (!prev.has(name)) added.push(name)

    if (added.length > 0) {
      setLines((ls) => [
        ...ls,
        ...added.map((name) => ({
          kind: "event" as const,
          text: `assertz(discovered(${name})).  % facts: ${discovered.size}`,
        })),
      ])
      setPulse(true)
      const id = window.setTimeout(() => setPulse(false), 900)
      prevRef.current = new Set(discovered)
      return () => window.clearTimeout(id)
    }
    // Shrunk (reset) — silently re-sync without logging.
    if (discovered.size < prev.size) {
      setLines((ls) => [
        ...ls,
        {
          kind: "event",
          text: `retractall(discovered(_)).  % progress reset`,
        },
      ])
    }
    prevRef.current = new Set(discovered)
  }, [discovered])

  // Stick the scrollback to the bottom whenever it grows.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  // We deliberately do NOT auto-focus on mount. The terminal can live
  // inside an off-screen mobile drawer and focusing a hidden input would
  // scroll the viewport on iOS / Android.

  const append = (...ls: Line[]) => setLines((prev) => [...prev, ...ls])

  const run = (raw: string) => {
    const src = raw.trim()
    if (!src) return

    // Push to history (deduplicated against the immediately-previous entry).
    setHistory((prev) =>
      prev[prev.length - 1] === src ? prev : [...prev, src],
    )
    setHistoryIdx(null)

    append({ kind: "query", text: src })

    // Intercept meta-commands. Trailing dot optional for these.
    const bare = src.replace(/\.$/, "").trim().toLowerCase()

    if (bare === "help") {
      append(
        { kind: "info", text: "Available predicates:" },
        ...BUILTIN_PREDICATES.map((p) => ({
          kind: "info" as const,
          text: `  ${p.name}/${p.arity}  —  ${p.summary}`,
        })),
        {
          kind: "info",
          text: "Commands: help. · clear. · samples. · listing.",
        },
      )
      return
    }
    if (bare === "clear") {
      setLines([{ kind: "banner", text: BANNER }])
      return
    }
    if (bare === "samples") {
      append(
        { kind: "info", text: "Example queries — tap any to load it:" },
        ...SAMPLES.map((s) => ({
          kind: "info" as const,
          text: "  ?- " + s,
        })),
      )
      return
    }
    if (bare === "listing") {
      const kb = buildKB(discovered)
      const entries = [...kb.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(
          ([k, clauses]) =>
            `  ${k.padEnd(14, " ")} ${clauses.length} fact${
              clauses.length === 1 ? "" : "s"
            }`,
        )
      append(
        { kind: "info", text: "Knowledge base:" },
        ...entries.map((text) => ({ kind: "info" as const, text })),
      )
      return
    }

    // Real Prolog query.
    let query
    try {
      query = parseQuery(src)
    } catch (e) {
      const msg = e instanceof PrologParseError ? e.message : String(e)
      append({ kind: "error", text: "parse error: " + msg })
      return
    }

    try {
      const kb = buildKB(discovered)
      const { solutions, truncated } = runQuery(query, kb, 50)
      if (solutions.length === 0) {
        append({ kind: "ok", text: "false." })
        return
      }
      // Ground queries (no variables) — just report success count.
      if (query.userVars.length === 0) {
        append({ kind: "ok", text: "true." })
        return
      }
      append({ kind: "bindings", solutions, truncated })
    } catch (e) {
      append({ kind: "error", text: "runtime error: " + String(e) })
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      run(input)
      setInput("")
      return
    }
    if (e.key === "ArrowUp") {
      if (history.length === 0) return
      e.preventDefault()
      const idx =
        historyIdx === null ? history.length - 1 : Math.max(0, historyIdx - 1)
      setHistoryIdx(idx)
      setInput(history[idx])
      return
    }
    if (e.key === "ArrowDown") {
      if (historyIdx === null) return
      e.preventDefault()
      const idx = historyIdx + 1
      if (idx >= history.length) {
        setHistoryIdx(null)
        setInput("")
      } else {
        setHistoryIdx(idx)
        setInput(history[idx])
      }
      return
    }
  }

  const tryExample = (q: string) => {
    setInput(q)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* -----------------------------------------------------------------
       * Header — mac-style dots + status line with live fact count.
       * The status dot pulses briefly whenever the KB updates.
       * ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-border bg-sidebar/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <span className="h-2 w-2 rounded-full bg-destructive/70" />
            <span className="h-2 w-2 rounded-full bg-primary/70" />
            <span className="h-2 w-2 rounded-full bg-accent/70" />
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span className="truncate font-mono text-xs font-medium">
              prolog — alchemy.pl
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2 py-0.5",
              pulse && "border-primary/60 shadow-[0_0_0_4px_oklch(0.78_0.16_75/0.12)]",
            )}
            title="Live fact count — updates when new elements are discovered"
          >
            <Circle
              className={cn(
                "h-2 w-2 fill-accent text-accent transition-transform",
                pulse && "scale-125",
              )}
              aria-hidden
            />
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {discovered.size} facts
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLines([{ kind: "banner", text: BANNER }])}
            className="h-7 gap-1.5 font-mono text-xs"
            title="Clear terminal"
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">clear</span>
          </Button>
        </div>
      </div>

      {/* -----------------------------------------------------------------
       * Scrollback. Each line renders through LineView, which branches on
       * `kind` to pick the right color + glyph in the gutter.
       * ----------------------------------------------------------------- */}
      <div
        ref={scrollRef}
        className="terminal-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2 font-mono text-[12px] leading-relaxed"
      >
        {lines.map((l, i) => (
          <LineView key={i} line={l} />
        ))}
      </div>

      {/* Sample buttons (shown until the user runs their first query). */}
      {history.length === 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border bg-sidebar/40 px-3 py-2">
          {SAMPLES.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => tryExample(s)}
              className={cn(
                "rounded border border-border bg-background/60 px-2 py-1",
                "font-mono text-[10.5px] text-muted-foreground",
                "hover:border-primary/60 hover:text-foreground transition-colors",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* -----------------------------------------------------------------
       * Prompt. The `?-` token matches real SWI-Prolog. A pulsing caret
       * makes the prompt feel alive even when no query has been issued.
       * ----------------------------------------------------------------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(input)
          setInput("")
        }}
        className={cn(
          "flex items-center gap-2 border-t border-border bg-background px-3 py-2",
          "focus-within:bg-sidebar/30 transition-colors",
        )}
      >
        <span aria-hidden className="font-mono text-xs text-primary">
          ?-
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="combine(water, fire, X)."
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className={cn(
            "min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground",
            "caret-primary placeholder:text-muted-foreground/40 focus:outline-none",
          )}
          aria-label="Prolog query"
        />
      </form>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
 * Line rendering.
 *
 * Each line type has its own color + gutter glyph:
 *   banner   italic grey
 *   query    `?-` prompt with syntax-highlighted query
 *   ok       green (true.) / muted (false.)
 *   bindings variable-binding table
 *   info     muted, with a chevron gutter
 *   event    accent color, with a bolt gutter — these are the live
 *            notifications pushed by the game
 *   error    destructive red
 * ═════════════════════════════════════════════════════════════════════════
 */

function LineView({ line }: { line: Line }) {
  if (line.kind === "banner") {
    return (
      <Row gutter="" tone="muted">
        <span className="italic text-muted-foreground/70">{line.text}</span>
      </Row>
    )
  }
  if (line.kind === "query") {
    return (
      <Row gutter="?-" tone="primary">
        <QueryText text={line.text} />
      </Row>
    )
  }
  if (line.kind === "ok") {
    const isTrue = line.text.startsWith("true")
    return (
      <Row gutter={isTrue ? "✓" : "·"} tone={isTrue ? "accent" : "muted"}>
        {line.text}
      </Row>
    )
  }
  if (line.kind === "info") {
    return (
      <Row gutter="›" tone="muted">
        <span className="whitespace-pre">{line.text}</span>
      </Row>
    )
  }
  if (line.kind === "event") {
    return (
      <Row gutter="+" tone="accent">
        <span className="text-accent/90">{line.text}</span>
      </Row>
    )
  }
  if (line.kind === "error") {
    return (
      <Row gutter="!" tone="error">
        {line.text}
      </Row>
    )
  }
  return <Bindings solutions={line.solutions} truncated={line.truncated} />
}

function Row({
  gutter,
  tone,
  children,
}: {
  gutter: string
  tone: "primary" | "accent" | "muted" | "error"
  children: React.ReactNode
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent"
        : tone === "error"
          ? "text-destructive"
          : "text-muted-foreground/60"
  return (
    <div className="alch-fade-in flex gap-2 px-1">
      <span
        aria-hidden
        className={cn(
          "w-4 shrink-0 select-none text-right font-mono text-[11px]",
          toneClass,
        )}
      >
        {gutter}
      </span>
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  )
}

/**
 * Tiny syntax highlighter for the echoed query:
 *   - Variables (Uppercase / _leading) -> primary
 *   - Atoms (lowercase identifiers)    -> foreground
 *   - Punctuation                      -> muted
 */
function QueryText({ text }: { text: string }) {
  const tokens = useMemo(() => {
    const out: { t: string; kind: "var" | "atom" | "sym" }[] = []
    let i = 0
    while (i < text.length) {
      const c = text[i]
      if (/[A-Z_]/.test(c)) {
        let j = i
        while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++
        out.push({ t: text.slice(i, j), kind: "var" })
        i = j
        continue
      }
      if (/[a-z]/.test(c)) {
        let j = i
        while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j++
        out.push({ t: text.slice(i, j), kind: "atom" })
        i = j
        continue
      }
      out.push({ t: c, kind: "sym" })
      i++
    }
    return out
  }, [text])

  return (
    <span>
      {tokens.map((tok, i) => (
        <span
          key={i}
          className={cn(
            tok.kind === "var" && "font-semibold text-primary",
            tok.kind === "atom" && "text-foreground",
            tok.kind === "sym" && "text-muted-foreground/70",
          )}
        >
          {tok.t}
        </span>
      ))}
    </span>
  )
}

function Bindings({
  solutions,
  truncated,
}: {
  solutions: Solution[]
  truncated: boolean
}) {
  return (
    <div className="alch-fade-in px-1 py-0.5">
      <div className="space-y-0.5 border-l-2 border-primary/30 pl-3">
        {solutions.map((sol, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-x-3 gap-y-0.5"
          >
            {sol.bindings.map((b, j) => (
              <span key={j} className="tabular-nums">
                <span className="font-semibold text-primary">{b.name}</span>
                <span className="text-muted-foreground/70">{" = "}</span>
                <span className="text-foreground">{b.value}</span>
              </span>
            ))}
            <span className="text-muted-foreground/50">
              {i < solutions.length - 1 || truncated ? ";" : "."}
            </span>
          </div>
        ))}
        {truncated && (
          <div className="italic text-muted-foreground/60">
            (first {solutions.length} solutions — more exist)
          </div>
        )}
      </div>
    </div>
  )
}
