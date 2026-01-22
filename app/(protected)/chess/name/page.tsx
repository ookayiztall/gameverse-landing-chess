"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { usePlayerState } from "@chess/state/player"

const filterAlphanumeric = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "")

export default function ChessSelectNamePage() {
  const router = useRouter()

  const storedUsername = usePlayerState((s) => s.username)
  const hydrateFromStorage = usePlayerState.getState().hydrateFromStorage
  const setUsername = usePlayerState.getState().setUsername
  const setRoom = usePlayerState.getState().setRoom
  const setJoinedRoom = usePlayerState.getState().setJoinedRoom

  const [name, setName] = useState(storedUsername)

  useEffect(() => {
    hydrateFromStorage()
    setJoinedRoom(false)
    setRoom("")
  }, [hydrateFromStorage, setJoinedRoom, setRoom])

  const normalized = useMemo(() => filterAlphanumeric(name).slice(0, 10), [name])
  const isValid = normalized.length >= 3

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-gradient-to-br from-background via-background to-primary/5 p-3 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold glow-text">3D Chess</h1>
            <p className="text-muted-foreground">Pick a display name to continue.</p>
          </div>
          <Link href="/games">
            <Button variant="outline" className="border-border bg-transparent">
              Back to Games
            </Button>
          </Link>
        </div>

        <Card className="bg-card/50 border-border/50 backdrop-blur p-6 md:p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="text-sm font-medium">Display Name</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="off"
                inputMode="text"
              />
              <div className="text-xs text-muted-foreground">
                3–10 characters, letters and numbers only.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                disabled={!isValid}
                onClick={() => {
                  const next = normalized
                  if (next.length < 3) return
                  setUsername(next)
                  router.push("/chess/lobby")
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
