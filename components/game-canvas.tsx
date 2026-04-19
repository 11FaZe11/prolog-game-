"use client"

import type { ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"
import { FlaskConical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { CanvasElement, type CanvasItem } from "./canvas-element"
import { CombineBurst } from "./combine-burst"

export type Burst = {
  id: number
  x: number
  y: number
}

/**
 * The "workbench" area where tokens are placed and dragged around.
 *
 * Accepts `children` for overlay effects (confetti showers fired by the
 * parent AlchemyGame on new discoveries) so those live above the tokens
 * but still inside the canvas coordinate space.
 */
export function GameCanvas({
  items,
  bursts,
  lastDiscovery,
  lastCombineFailed,
  onRemove,
  onClear,
  children,
}: {
  items: CanvasItem[]
  bursts: Burst[]
  lastDiscovery: { a: string; b: string; result: string } | null
  lastCombineFailed: { a: string; b: string } | null
  onRemove: (id: string) => void
  onClear: () => void
  children?: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-root",
    data: { type: "canvas-root" },
  })

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/* Canvas header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-sidebar/60 px-3 py-2 md:px-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" aria-hidden />
          <h1 className="font-mono text-sm font-medium">workbench</h1>
          <span
            className="font-mono text-xs text-muted-foreground/70"
            aria-live="polite"
          >
            {items.length === 0
              ? "empty"
              : items.length === 1
                ? "1 element"
                : `${items.length} elements`}
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Discovery / failure readout. Lives in the header on desktop so
              it doesn't crowd the mobile workbench. */}
          {lastDiscovery && (
            <span
              key={`ok-${lastDiscovery.result}`}
              className="alch-fade-in hidden font-mono text-xs text-accent sm:inline"
            >
              {lastDiscovery.a}
              <span className="text-muted-foreground">{" + "}</span>
              {lastDiscovery.b}
              <span className="text-muted-foreground">{" = "}</span>
              <span className="font-semibold">{lastDiscovery.result}</span>
            </span>
          )}
          {lastCombineFailed && !lastDiscovery && (
            <span
              key={`no-${lastCombineFailed.a}-${lastCombineFailed.b}`}
              className="alch-fade-in hidden font-mono text-xs text-muted-foreground sm:inline"
            >
              {lastCombineFailed.a}
              <span>{" + "}</span>
              {lastCombineFailed.b}
              <span>{" = "}</span>
              <span className="text-destructive">no recipe</span>
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            disabled={items.length === 0}
            className="h-7 gap-1.5 font-mono text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            clear
          </Button>
        </div>
      </header>

      {/* Canvas surface */}
      <div
        ref={setNodeRef}
        className={cn(
          "canvas-grid relative flex-1 overflow-hidden",
          isOver && "bg-primary/[0.03]",
        )}
      >
        {items.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <p className="font-mono text-sm text-muted-foreground">
                Empty workbench.
              </p>
              <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground/70">
                Tap an element below to place it here, then drag one token
                onto another to combine them.
              </p>
              <p className="mt-3 font-mono text-[11px] text-muted-foreground/50">
                Hint: try{" "}
                <code className="rounded bg-secondary/60 px-1 py-0.5 text-foreground">
                  water + fire
                </code>
                .
              </p>
            </div>
          </div>
        )}

        {/* Mobile-only inline discovery toast since there's no room for it
            in the tight header. */}
        {(lastDiscovery || lastCombineFailed) && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 sm:hidden">
            {lastDiscovery && (
              <div
                key={`m-ok-${lastDiscovery.result}`}
                className="alch-fade-in rounded-full border border-accent/40 bg-background/80 px-3 py-1 font-mono text-[11px] text-accent backdrop-blur-sm"
              >
                {lastDiscovery.a}{" + "}
                {lastDiscovery.b}{" = "}
                <span className="font-semibold">{lastDiscovery.result}</span>
              </div>
            )}
            {lastCombineFailed && !lastDiscovery && (
              <div
                key={`m-no-${lastCombineFailed.a}-${lastCombineFailed.b}`}
                className="alch-fade-in rounded-full border border-border bg-background/80 px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur-sm"
              >
                {lastCombineFailed.a}
                {" + "}
                {lastCombineFailed.b}
                {" = "}
                <span className="text-destructive">no recipe</span>
              </div>
            )}
          </div>
        )}

        {items.map((item) => (
          <CanvasElement key={item.id} item={item} onRemove={onRemove} />
        ))}

        {bursts.map((b) => (
          <CombineBurst key={b.id} x={b.x} y={b.y} />
        ))}

        {children}
      </div>
    </section>
  )
}
