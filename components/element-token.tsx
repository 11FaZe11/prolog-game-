"use client"

import {
  Droplet,
  Flame,
  Mountain,
  Wind,
  Leaf,
  Sun,
  Snowflake,
  Sparkles,
  Cog,
  User,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ELEMENTS, type ElementCategory } from "@/lib/recipes"

/* -------------------------------------------------------------------------
 * Category -> visual palette.
 *
 * Using a fixed palette per category (instead of hashing the name into a
 * random hue) groups visually-related elements together — every water-like
 * thing is blue, every fire thing is warm, every plant green, etc. Makes
 * the inventory readable at a glance.
 * ------------------------------------------------------------------------- */

type Palette = {
  /** OKLCH hue for the radial gradient */
  hue: number
  /** OKLCH chroma (color intensity) */
  chroma: number
  /** Fallback icon when no element-specific icon is mapped */
  icon: LucideIcon
}

const CATEGORY_PALETTE: Record<ElementCategory, Palette> = {
  water: { hue: 220, chroma: 0.14, icon: Droplet },
  fire: { hue: 35, chroma: 0.17, icon: Flame },
  earth: { hue: 65, chroma: 0.09, icon: Mountain },
  air: { hue: 200, chroma: 0.08, icon: Wind },
  plant: { hue: 145, chroma: 0.14, icon: Leaf },
  life: { hue: 340, chroma: 0.13, icon: User },
  material: { hue: 260, chroma: 0.05, icon: Cog },
  cold: { hue: 210, chroma: 0.07, icon: Snowflake },
  special: { hue: 75, chroma: 0.17, icon: Sparkles },
}

/**
 * A small set of element-specific icon overrides for the ones the player
 * sees earliest. Unmapped elements just use their category icon.
 */
const ICON_OVERRIDES: Record<string, LucideIcon> = {
  water: Droplet,
  fire: Flame,
  earth: Mountain,
  air: Wind,
  sun: Sun,
  rain: Droplet,
  steam: Wind,
  lava: Flame,
  ice: Snowflake,
  glacier: Snowflake,
  iceberg: Snowflake,
  plant: Leaf,
  tree: Leaf,
  grass: Leaf,
  forest: Leaf,
  wind: Wind,
  cloud: Wind,
  sky: Wind,
  storm: Wind,
  tornado: Wind,
  energy: Sparkles,
  rainbow: Sparkles,
  lightning: Sparkles,
  electricity: Sparkles,
  robot: Cog,
  tool: Cog,
  computer: Cog,
  human: User,
  farmer: User,
  fisher: User,
  knight: User,
  hero: User,
  sailor: User,
  pirate: User,
  programmer: User,
  family: User,
  village: User,
  city: User,
  country: User,
}

function iconFor(name: string): LucideIcon {
  return (
    ICON_OVERRIDES[name] ??
    CATEGORY_PALETTE[ELEMENTS[name]?.category ?? "special"].icon
  )
}

function paletteFor(name: string): Palette {
  return CATEGORY_PALETTE[ELEMENTS[name]?.category ?? "special"]
}

type Size = "sm" | "md" | "lg"

const sizeStyles: Record<
  Size,
  { box: string; icon: string; label: string }
> = {
  sm: {
    box: "h-10 w-10",
    icon: "h-4 w-4",
    label: "text-[11px]",
  },
  md: {
    box: "h-14 w-14",
    icon: "h-6 w-6",
    label: "text-xs",
  },
  lg: {
    box: "h-20 w-20",
    icon: "h-9 w-9",
    label: "text-sm",
  },
}

export function ElementToken({
  name,
  size = "md",
  withLabel = true,
  selected = false,
  locked = false,
  className,
}: {
  name: string
  size?: Size
  withLabel?: boolean
  selected?: boolean
  /** Render as a silhouette (for undiscovered recipe hints) */
  locked?: boolean
  className?: string
}) {
  const palette = paletteFor(name)
  const Icon = iconFor(name)
  const sz = sizeStyles[size]

  // Two-stop radial gradient keyed off the category's hue.
  const background = locked
    ? "oklch(0.28 0.005 260)"
    : `radial-gradient(circle at 30% 25%,
        oklch(0.85 ${palette.chroma} ${palette.hue}) 0%,
        oklch(0.58 ${palette.chroma} ${palette.hue}) 55%,
        oklch(0.32 ${Math.min(palette.chroma, 0.08)} ${palette.hue}) 100%)`

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 select-none",
        className,
      )}
    >
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center",
          "ring-1 ring-inset ring-border/60 shadow-lg shadow-black/30",
          "transition-transform duration-200",
          !locked && "hover:scale-105",
          selected && "ring-2 ring-primary scale-105",
          sz.box,
        )}
        style={{
          background,
          color: locked ? "oklch(0.4 0.01 260)" : "oklch(0.15 0.02 0)",
        }}
        aria-hidden
      >
        <Icon className={cn(sz.icon, "drop-shadow-sm")} strokeWidth={2.2} />
        {!locked && (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
        )}
      </div>
      {withLabel && (
        <span
          className={cn(
            "font-mono lowercase tracking-tight",
            locked ? "text-muted-foreground/50" : "text-muted-foreground",
            sz.label,
          )}
        >
          {locked ? "???" : name}
        </span>
      )}
    </div>
  )
}
