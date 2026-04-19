"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { BookOpen, FlaskConical, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppHeader } from "./app-header"
import { GameCanvas, type Burst } from "./game-canvas"
import { InventoryPanel } from "./inventory-panel"
import { CodexPanel, type DiscoveryEntry } from "./codex-panel"
import { DiscoveryConfetti } from "./discovery-confetti"
import type { CanvasItem } from "./canvas-element"
import { cn } from "@/lib/utils"

import { getEngine } from "@/lib/alchemy-engine"
import { STARTER_ELEMENTS } from "@/lib/recipes"

/* ═════════════════════════════════════════════════════════════════════════
 * Top-level game container.
 *
 * Owns ALL shared state:
 *   - canvasItems   : tokens currently placed on the workbench
 *   - inventory     : ordered list of every element the player has seen
 *   - discovered    : Set version of `inventory` for fast lookup
 *   - log           : rolling history of successful merges (for the Codex)
 *   - bursts        : active particle bursts on the canvas
 *   - confetti      : active confetti showers (only fresh discoveries)
 *   - sidebarOpen   : whether the codex sidebar is open on mobile
 *
 * Layout:
 *   md+     : game + codex side-by-side as a two-pane desktop IDE
 *   <md     : game fills the screen; codex slides in from the right as an
 *             overlay drawer triggered from the top bar.
 * ═════════════════════════════════════════════════════════════════════════
 */

type ConfettiBurst = { id: number; x: number; y: number; seed: string }

export function AlchemyGame() {
  const engine = useMemo(() => getEngine(), [])

  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([])
  const [inventory, setInventory] = useState<string[]>([...STARTER_ELEMENTS])
  const [recentlyDiscovered, setRecentlyDiscovered] = useState<string | null>(
    null,
  )
  const [lastDiscovery, setLastDiscovery] = useState<
    { a: string; b: string; result: string } | null
  >(null)
  const [lastCombineFailed, setLastCombineFailed] = useState<
    { a: string; b: string } | null
  >(null)
  const [log, setLog] = useState<DiscoveryEntry[]>([])
  const [bursts, setBursts] = useState<Burst[]>([])
  const [confetti, setConfetti] = useState<ConfettiBurst[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Tracks whether the mobile drawer has been opened at least once. We use
  // this to keep the codex mounted after its first open so its internal
  // state (Prolog REPL history, tab, search) persists between opens —
  // without paying the mount cost on initial page load.
  const sidebarHasOpenedRef = useRef(false)
  useEffect(() => {
    if (sidebarOpen) sidebarHasOpenedRef.current = true
  }, [sidebarOpen])

  const discovered = useMemo(() => new Set(inventory), [inventory])

  // Monotonic id factories.
  const nextItemIdRef = useRef(0)
  const mintItemId = () => {
    nextItemIdRef.current += 1
    return `i${nextItemIdRef.current}`
  }
  const nextLogIdRef = useRef(0)
  const mintLogId = () => {
    nextLogIdRef.current += 1
    return nextLogIdRef.current
  }
  const nextBurstIdRef = useRef(0)
  const mintBurstId = () => {
    nextBurstIdRef.current += 1
    return nextBurstIdRef.current
  }

  // --- Spawning + placement -------------------------------------
  const spawnFromInventory = useCallback((name: string) => {
    setCanvasItems((prev) => {
      // Stagger spawns so new tokens don't stack exactly on top of each other.
      const offset = prev.length * 14
      return [
        ...prev,
        {
          id: mintItemId(),
          element: name,
          x: 80 + (offset % 200),
          y: 72 + ((offset * 1.3) % 160),
          phase: "entering",
        },
      ]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setCanvasItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  const clearCanvas = useCallback(() => {
    setCanvasItems([])
    setBursts([])
    setConfetti([])
    setLastDiscovery(null)
    setLastCombineFailed(null)
  }, [])

  const resetProgress = useCallback(() => {
    setCanvasItems([])
    setBursts([])
    setConfetti([])
    setInventory([...STARTER_ELEMENTS])
    setLog([])
    setLastDiscovery(null)
    setLastCombineFailed(null)
    setRecentlyDiscovered(null)
  }, [])

  // --- Combine logic --------------------------------------------
  const runCombine = useCallback(
    async (draggedId: string, targetId: string) => {
      const dragged = canvasItems.find((i) => i.id === draggedId)
      const target = canvasItems.find((i) => i.id === targetId)
      if (!dragged || !target) return

      const a = dragged.element
      const b = target.element
      const result = await engine.combine(a, b)

      if (!result) {
        // Failed combine: shake both inputs.
        setLastCombineFailed({ a, b })
        setLastDiscovery(null)
        setCanvasItems((prev) =>
          prev.map((it) =>
            it.id === draggedId || it.id === targetId
              ? { ...it, phase: "shaking" }
              : it,
          ),
        )
        setTimeout(() => {
          setCanvasItems((prev) =>
            prev.map((it) =>
              it.id === draggedId || it.id === targetId
                ? { ...it, phase: "idle" }
                : it,
            ),
          )
        }, 340)
        return
      }

      // Success!
      setCanvasItems((prev) =>
        prev.map((it) =>
          it.id === draggedId || it.id === targetId
            ? { ...it, phase: "dissolving" }
            : it,
        ),
      )

      const resultX = target.x
      const resultY = target.y
      const isFresh = !inventory.includes(result)

      window.setTimeout(() => {
        setCanvasItems((prev) => {
          const filtered = prev.filter(
            (i) => i.id !== draggedId && i.id !== targetId,
          )
          return [
            ...filtered,
            {
              id: mintItemId(),
              element: result,
              x: resultX,
              y: resultY,
              phase: "entering",
            },
          ]
        })
      }, 240)

      // Particle burst (always).
      const burstId = mintBurstId()
      setBursts((prev) => [
        ...prev,
        { id: burstId, x: resultX + 28, y: resultY + 28 },
      ])
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burstId))
      }, 700)

      // Confetti + discover pulse — only on first-time discovery.
      if (isFresh) {
        const confId = mintBurstId()
        setConfetti((prev) => [
          ...prev,
          {
            id: confId,
            x: resultX + 28,
            y: resultY + 28,
            seed: `${result}-${confId}`,
          },
        ])
        window.setTimeout(() => {
          setConfetti((prev) => prev.filter((c) => c.id !== confId))
        }, 1100)
      }

      setInventory((prev) => (prev.includes(result) ? prev : [...prev, result]))
      setLastDiscovery({ a, b, result })
      setLastCombineFailed(null)
      setRecentlyDiscovered(result)
      window.setTimeout(
        () => setRecentlyDiscovered((cur) => (cur === result ? null : cur)),
        1800,
      )

      setLog((prev) => [
        ...prev,
        { id: mintLogId(), a, b, result, fresh: isFresh },
      ])
    },
    [canvasItems, engine, inventory],
  )

  // --- DnD wiring ------------------------------------------------
  //
  // Separate sensors for mouse vs touch:
  //   - Mouse: activate on 4px drag (fast & responsive).
  //   - Touch: activate on 150ms press + 6px tolerance so one-finger
  //     scroll still works across the page. Without the delay, every tap
  //     on a token would steal scroll gestures.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, delta } = event
      const activeData = active.data.current as
        | { type: string; itemId: string }
        | undefined
      if (!activeData || activeData.type !== "canvas-item") return

      const activeItemId = activeData.itemId
      const overData = over?.data.current as
        | { type: string; itemId?: string }
        | undefined

      if (
        overData?.type === "canvas-item" &&
        overData.itemId &&
        overData.itemId !== activeItemId
      ) {
        void runCombine(activeItemId, overData.itemId)
        return
      }

      setCanvasItems((prev) =>
        prev.map((it) =>
          it.id === activeItemId
            ? {
                ...it,
                x: clamp(it.x + delta.x, 0, 10_000),
                y: clamp(it.y + delta.y, 0, 10_000),
                phase: "idle",
              }
            : it,
        ),
      )
    },
    [runCombine],
  )

  // Clear the "entering" phase after animation completes so idle-float
  // can take over.
  useEffect(() => {
    const entering = canvasItems.filter((it) => it.phase === "entering")
    if (entering.length === 0) return
    const t = window.setTimeout(() => {
      setCanvasItems((prev) =>
        prev.map((it) =>
          it.phase === "entering" ? { ...it, phase: "idle" } : it,
        ),
      )
    }, 460)
    return () => window.clearTimeout(t)
  }, [canvasItems])

  // Close the mobile drawer when any arrow/escape key is hit so it's
  // keyboardable.
  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarOpen])

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <TopBar
          discoveredCount={inventory.length}
          onOpenSidebar={() => setSidebarOpen(true)}
          logCount={log.length}
        />

        <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
          {/* LEFT: game */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <GameCanvas
              items={canvasItems}
              bursts={bursts}
              lastDiscovery={lastDiscovery}
              lastCombineFailed={lastCombineFailed}
              onRemove={removeItem}
              onClear={clearCanvas}
            >
              {/* Confetti layered over the canvas surface. */}
              {confetti.map((c) => (
                <DiscoveryConfetti
                  key={c.id}
                  x={c.x}
                  y={c.y}
                  seed={c.seed}
                />
              ))}
            </GameCanvas>
            <InventoryPanel
              elements={inventory}
              recentlyDiscovered={recentlyDiscovered}
              onSpawn={spawnFromInventory}
            />
          </div>

          {/* RIGHT: codex — inline sidebar on desktop, overlay on mobile. */}
          <aside className="hidden min-h-0 w-full flex-col md:flex md:w-[400px] lg:w-[460px]">
            <CodexPanel
              discovered={discovered}
              log={log}
              onReset={resetProgress}
            />
          </aside>

          <MobileDrawer
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          >
            {/*
              Only mount the codex (and its Prolog terminal) once the drawer
              has been opened. Keeps the tree lean on first load and avoids
              the terminal input stealing focus into an off-screen pane.
              We keep it mounted after the first open so state persists.
            */}
            {(sidebarOpen || sidebarHasOpenedRef.current) && (
              <CodexPanel
                discovered={discovered}
                log={log}
                onReset={resetProgress}
              />
            )}
          </MobileDrawer>
        </div>
      </div>
    </DndContext>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
 * Top bar — compact logo + discovery count on desktop; adds a codex
 * trigger button on mobile.
 * ═════════════════════════════════════════════════════════════════════════
 */

function TopBar({
  discoveredCount,
  onOpenSidebar,
  logCount,
}: {
  discoveredCount: number
  onOpenSidebar: () => void
  logCount: number
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-sidebar px-3 py-2 md:px-4">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <FlaskConical className="h-4 w-4" aria-hidden />
        </div>
        <span className="font-mono text-sm font-semibold tracking-tight">
          alchemy lab
        </span>
        <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">
          combine elements, discover everything
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-3 font-mono text-[11px] text-muted-foreground sm:flex">
          <span>{discoveredCount} discovered</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span>drag + drop</span>
        </div>

        {/* Mobile: open codex */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenSidebar}
          className="relative h-8 gap-1.5 font-mono text-xs md:hidden"
        >
          <BookOpen className="h-3.5 w-3.5" />
          codex
          {logCount > 0 && (
            <span className="ml-0.5 rounded-sm bg-primary/15 px-1 py-0.5 text-[10px] text-primary">
              {logCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  )
}

/* ═════════════════════════════════════════════════════════════════════════
 * Mobile drawer — a full-height panel that slides in from the right with
 * a dimmed backdrop. Tap outside or the close button to dismiss.
 * ═════════════════════════════════════════════════════════════════════════
 */

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close codex"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Codex"
        className={cn(
          "absolute right-0 top-0 flex h-full w-[92%] max-w-[420px] flex-col",
          "border-l border-border bg-background shadow-2xl",
          "transition-transform duration-300 ease-out will-change-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="font-mono text-xs font-medium">codex</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7"
            aria-label="Close codex"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
