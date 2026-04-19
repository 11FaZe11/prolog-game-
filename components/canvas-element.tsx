"use client"

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { X } from "lucide-react"
import { ElementToken } from "./element-token"
import { cn } from "@/lib/utils"

export type CanvasItem = {
  /** Unique per placement — two copies of `water` have different ids. */
  id: string
  element: string
  x: number
  y: number
  /** Animation state driven by the game layer. */
  phase?: "idle" | "entering" | "dissolving" | "shaking"
}

/**
 * A token placed on the canvas. Simultaneously:
 *   - draggable (you can reposition or drop it onto another token)
 *   - droppable (another token can be dropped onto it to combine)
 *
 * The draggable and droppable IDs are namespaced so the parent's
 * handleDragEnd can tell "moved" from "combined".
 */
export function CanvasElement({
  item,
  onRemove,
}: {
  item: CanvasItem
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `drag-${item.id}`,
    data: { type: "canvas-item", itemId: item.id, element: item.element },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${item.id}`,
    data: { type: "canvas-item", itemId: item.id, element: item.element },
  })

  // Merge refs so draggable + droppable share the same DOM node.
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node)
    setDropRef(node)
  }

  const dx = transform?.x ?? 0
  const dy = transform?.y ?? 0

  const phaseClass =
    item.phase === "entering"
      ? "alch-drop-in"
      : item.phase === "dissolving"
        ? "alch-combine pointer-events-none"
        : item.phase === "shaking"
          ? "alch-shake"
          : // Subtle idle float, but not while dragging
            !isDragging && "alch-float"

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: "absolute",
        left: item.x,
        top: item.y,
        transform: `translate3d(${dx}px, ${dy}px, 0)`,
        zIndex: isDragging ? 30 : isOver ? 20 : 10,
        touchAction: "none",
      }}
      className={cn(
        "group cursor-grab active:cursor-grabbing",
        isDragging && "cursor-grabbing",
      )}
    >
      <div
        className={cn(
          "relative rounded-full transition-shadow duration-200",
          // "canvas-aura" paints a subtle warm glow under every token so
          // the workbench feels lit. See globals.css.
          "canvas-aura",
          isOver &&
            "alch-magnetic ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_32px_-2px_oklch(0.78_0.16_75/0.7)]",
          phaseClass,
        )}
      >
        <ElementToken name={item.element} size="md" />
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item.id)
        }}
        className={cn(
          "absolute -top-1 -right-1 h-5 w-5 rounded-full",
          "bg-secondary text-secondary-foreground border border-border",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "flex items-center justify-center",
        )}
        aria-label={`Remove ${item.element}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
