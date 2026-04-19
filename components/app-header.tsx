"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppHeaderProps {
  onMenuClick?: () => void
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      {/* Logo and branding */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg sm:h-12 sm:w-12">
          <img
            src="/logo.png"
            alt="ALOGIC Logo"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="hidden flex-col sm:flex">
          <h1 className="text-base font-bold text-foreground">ALOGIC</h1>
          <p className="text-xs text-muted-foreground">The Cognitive Alchemy</p>
        </div>
      </div>

      {/* Mobile menu button */}
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="sm:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
    </header>
  )
}
