"use client"

import { useMemo } from "react"

/**
 * A one-shot particle burst rendered at (x, y) on the canvas.
 *
 * Used to punctuate a successful combination: a central ring expands,
 * then a ring of small particles flies outward. Each particle computes
 * its own direction from its index so the effect is deterministic
 * (and therefore SSR-safe — no Math.random at render time).
 *
 * The parent component is expected to mount this, wait for the CSS
 * animation to finish (~600 ms), then unmount it.
 */
export function CombineBurst({
  x,
  y,
  colorHue = 75,
  particles = 12,
}: {
  x: number
  y: number
  /** OKLCH hue for the burst color. Default matches --primary. */
  colorHue?: number
  particles?: number
}) {
  const sparks = useMemo(() => {
    const arr: { dx: number; dy: number; size: number }[] = []
    const radius = 56
    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2
      const r = radius * (0.75 + (i % 3) * 0.15)
      arr.push({
        dx: Math.cos(angle) * r,
        dy: Math.sin(angle) * r,
        size: 4 + (i % 3) * 2,
      })
    }
    return arr
  }, [particles])

  const color = `oklch(0.78 0.16 ${colorHue})`

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{ left: x, top: y, width: 0, height: 0, zIndex: 40 }}
    >
      {/* Expanding ring */}
      <span
        className="alch-burst absolute rounded-full"
        style={{
          left: 0,
          top: 0,
          width: 56,
          height: 56,
          border: `2px solid ${color}`,
          background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
          opacity: 0.35,
        }}
      />
      {/* Particle shower */}
      {sparks.map((s, i) => (
        <span
          key={i}
          className="alch-particle absolute rounded-full"
          style={
            {
              left: 0,
              top: 0,
              width: s.size,
              height: s.size,
              background: color,
              boxShadow: `0 0 8px ${color}`,
              "--dx": `${s.dx}px`,
              "--dy": `${s.dy}px`,
              "--dx0": "0px",
              "--dy0": "0px",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
