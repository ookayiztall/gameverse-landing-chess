"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type BlackjackOutcome = "win" | "loss" | "tie"

type BlackjackRoundEndMessage = {
  source: "gameverse_blackjack"
  type: "round_end"
  outcome: BlackjackOutcome
  reason?: string
  announcement?: string
}

type BlackjackUpdateResponse = {
  ok: boolean
  points: number
  pointsDelta: number
  total_wins: number
  total_losses: number
  win_streak: number
}

export default function BlackjackPage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const updatingRef = useRef(false)

  const [phase, setPhase] = useState<"start" | "loading" | "playing">("start")
  const [srcDoc, setSrcDoc] = useState<string>("")
  const [lastOutcome, setLastOutcome] = useState<BlackjackOutcome | null>(null)
  const [lastDelta, setLastDelta] = useState<number | null>(null)
  const [totalPoints, setTotalPoints] = useState<number | null>(null)
  const testIframeHeightPx = 720

  const startGame = async () => {
    if (phase !== "start") return
    setPhase("loading")
    try {
      const res = await fetch("/api/blackjack", { method: "GET" })
      if (!res.ok) {
        setPhase("start")
        return
      }
      const html = await res.text()
      setSrcDoc(html)
      setPhase("playing")
    } catch {
      setPhase("start")
    }
  }

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) return

      const data = event.data as Partial<BlackjackRoundEndMessage> | null
      if (!data || data.source !== "gameverse_blackjack" || data.type !== "round_end") return
      if (data.outcome !== "win" && data.outcome !== "loss" && data.outcome !== "tie") return
      if (updatingRef.current) return

      updatingRef.current = true
      try {
        const res = await fetch("/api/blackjack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcome: data.outcome, reason: data.reason }),
        })

        if (!res.ok) return
        const json = (await res.json()) as BlackjackUpdateResponse
        if (!json.ok) return

        setLastOutcome(data.outcome)
        setLastDelta(json.pointsDelta)
        setTotalPoints(json.points)
      } finally {
        updatingRef.current = false
      }
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-gradient-to-br from-background via-background to-primary/5 p-3 md:p-8 flex flex-col">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 flex-1 min-h-0 w-full">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold glow-text">Black Jack</h1>
            <p className="text-muted-foreground">Wins add points to your profile and leaderboard.</p>
          </div>
          <Link href="/games">
            <Button variant="outline" className="border-border bg-transparent">
              Back to Games
            </Button>
          </Link>
        </div>

        <div className="hidden md:grid grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border/50 backdrop-blur p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Result</p>
            <p className="text-2xl font-bold mt-1">{lastOutcome ? lastOutcome.toUpperCase() : "—"}</p>
          </Card>
          <Card className="bg-card/50 border-border/50 backdrop-blur p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Points</p>
            <p className="text-2xl font-bold mt-1">
              {lastDelta != null ? `${lastDelta >= 0 ? "+" : ""}${lastDelta}` : "—"}
            </p>
          </Card>
          <Card className="bg-card/50 border-border/50 backdrop-blur p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Points</p>
            <p className="text-2xl font-bold mt-1">{totalPoints != null ? totalPoints.toLocaleString() : "—"}</p>
          </Card>
        </div>

        <Card
          className="bg-card/50 border-border/50 backdrop-blur overflow-hidden flex-1 min-h-[560px]"
          style={{ height: testIframeHeightPx }}
        >
          {phase === "start" ? (
            <div className="h-full min-h-[560px] flex items-center justify-center p-6">
              <div className="w-full max-w-md text-center space-y-4">
                <h2 className="text-2xl font-semibold">Ready to play?</h2>
                <p className="text-muted-foreground">
                  Start a new game and climb the leaderboard.
                </p>
                <Button size="lg" className="w-full" onClick={startGame}>
                  Start Game
                </Button>
              </div>
            </div>
          ) : phase === "loading" ? (
            <div className="h-full min-h-[560px] flex items-center justify-center p-10 text-center text-muted-foreground">
              Loading Blackjack…
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              title="Simple Black Jack"
              srcDoc={srcDoc}
              className="w-full bg-transparent block"
              height={testIframeHeightPx}
              style={{ height: testIframeHeightPx, display: "block" }}
              sandbox="allow-scripts"
            />
          )}
        </Card>
      </div>
    </div>
  )
}
