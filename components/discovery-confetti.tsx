"use client"

import { useMemo } from "react"

/**
 * One-shot confetti shower, fired only for FIRST-time discoveries.
 *
 * The parent component is responsible for mounting this on a new
 * discovery and unmounting it after ~1000 ms. Particles are deterministic
 * (seeded on the result name + mount count) so SSR and client agree and
 * we don't warn about hydration mismatches.
 */
export function DiscoveryConfetti({
  x,
  y,
  seed,
  count = 28,
}: {
  x: number
  y: number
  /** Stable seed so renders match between server and client. */
  seed: string
  count?: number
}) {
  const sparks = useMemo(() => {
    // xorshift-ish deterministic PRNG keyed on the seed.
    let s = 0
    for (let i = 0; i < seed.length; i++) {
      s = ((s << 5) - s + seed.charCodeAt(i)) | 0
    }
    const next = () => {
      s = (s * 48271) | 0
      return ((s >>> 0) % 10_000) / 10_000
    }
    const palette = [
      "oklch(0.78 0.16 75)", // gold
      "oklch(0.72 0.17 160)", // emerald
      "oklch(0.7 0.14 210)", // blue
      "oklch(0.82 0.14 35)", // coral
    ]
    const out: {
      dx: number
      dy: number
      rot: number
      color: string
      size: number
    }[] = []
    for (let i = 0; i < count; i++) {
      const angle = next() * Math.PI * 2
      const speed = 80 + next() * 140
      const dx = Math.cos(angle) * speed
      // Let some fall further down (gravity).
      const dy = Math.sin(angle) * speed + 40 + next() * 40
      out.push({
        dx,
        dy,
        rot: (next() - 0.5) * 720,
        color: palette[i % palette.length],
        size: 5 + Math.floor(next() * 5),
      })
    }
    return out
  }, [seed, count])

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{ left: x, top: y, width: 0, height: 0, zIndex: 50 }}
    >
      {sparks.map((s, i) => (
        <span
          key={i}
          className="alch-confetti absolute rounded-sm"
          style={
            {
              left: 0,
              top: 0,
              width: s.size,
              height: s.size * 1.6,
              background: s.color,
              boxShadow: `0 0 8px ${s.color}`,
              "--cdx": `${s.dx}px`,
              "--cdy": `${s.dy}px`,
              "--crot": `${s.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
