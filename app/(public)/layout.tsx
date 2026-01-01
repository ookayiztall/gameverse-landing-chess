import type React from "react"
import { MainNav } from "@/components/main-nav" // Import MainNav for consistency

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <MainNav />

      <main className="flex-1">{children}</main>

      {/* Public Footer */}
      <footer className="border-t border-border bg-background/50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground text-sm">
            <p>&copy; 2025 GameVerse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
