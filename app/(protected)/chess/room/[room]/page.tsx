"use client"

import "react-toastify/dist/ReactToastify.css"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { GameOver } from "@chess/pages/index"
import ChessHome from "@chess/pages/index"
import { usePlayerState } from "@chess/state/player"
import { useSocketState } from "@chess/utils/socket"

type ChessOutcome = "win" | "loss" | "draw"

type ChessUpdateResponse = {
  ok: boolean
  points: number
  pointsDelta: number
  total_wins: number
  total_losses: number
  win_streak: number
}

function RoomAutoJoin({ roomId }: { roomId: string }) {
  const socket = useSocketState((s) => s.socket)
  const username = usePlayerState((s) => s.username)
  const id = usePlayerState((s) => s.id)

  const lastJoinRef = useRef<{ roomId: string; socketId: string | undefined } | null>(null)

  useEffect(() => {
    if (!socket) return
    if (username.length < 3) return
    if (!roomId) return

    const attemptJoin = () => {
      const next = { roomId, socketId: socket.id }
      const prev = lastJoinRef.current
      if (prev?.roomId === next.roomId && prev?.socketId === next.socketId) return
      lastJoinRef.current = next
      socket.emit("joinRoom", { room: roomId, username: `${username}#${id}` })
      socket.emit("fetchPlayers", { room: roomId })
    }

    attemptJoin()
    socket.on("connect", attemptJoin)
    return () => {
      socket.off("connect", attemptJoin)
    }
  }, [id, roomId, socket, username])

  return null
}

export default function ChessRoomPage() {
  const params = useParams<{ room?: string | string[] }>()
  const roomParam = params?.room
  const roomId = Array.isArray(roomParam) ? roomParam[0] ?? "" : roomParam ?? ""
  const router = useRouter()
  const updatingRef = useRef(false)

  const username = usePlayerState((s) => s.username)
  const hydrated = usePlayerState((s) => s.hydrated)
  const setRoom = usePlayerState.getState().setRoom
  const setJoinedRoom = usePlayerState.getState().setJoinedRoom
  const hydrateFromStorage = usePlayerState.getState().hydrateFromStorage

  useEffect(() => {
    hydrateFromStorage()
  }, [hydrateFromStorage])

  useEffect(() => {
    if (hydrated && username.length < 3) {
      router.replace("/chess/name")
      return
    }
    setRoom(roomId)
    setJoinedRoom(false)
  }, [hydrated, roomId, router, setJoinedRoom, setRoom, username.length])

  const [lastOutcome, setLastOutcome] = useState<ChessOutcome | null>(null)
  const [lastDelta, setLastDelta] = useState<number | null>(null)
  const [totalPoints, setTotalPoints] = useState<number | null>(null)

  const onReset = useCallback(() => {
    updatingRef.current = false
    setLastOutcome(null)
    setLastDelta(null)
  }, [])

  const onGameOver = useCallback(async (gameOver: GameOver) => {
    if (updatingRef.current) return

    const { playerColor, joinedRoom, room } = usePlayerState.getState()
    if (!joinedRoom) return

    const outcome: ChessOutcome =
      gameOver.type === "stalemate" ? "draw" : gameOver.winner === playerColor ? "win" : "loss"

    updatingRef.current = true
    try {
      const res = await fetch("/api/chess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, gameOverType: gameOver.type, room }),
      })

      if (!res.ok) return
      const json = (await res.json()) as ChessUpdateResponse
      if (!json.ok) return

      setLastOutcome(outcome)
      setLastDelta(json.pointsDelta)
      setTotalPoints(json.points)
    } finally {
      updatingRef.current = false
    }
  }, [])

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-gradient-to-br from-background via-background to-primary/5 p-3 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold glow-text">3D Chess</h1>
            <p className="text-muted-foreground">Room #{roomId}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/chess/lobby">
              <Button variant="outline" className="border-border bg-transparent">
                Back to Lobby
              </Button>
            </Link>
          </div>
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

        <Card className="bg-card/50 border-border/50 backdrop-blur overflow-hidden min-h-[640px]">
          <div className="h-[calc(100svh-12rem)] min-h-[640px] w-full">
            <RoomAutoJoin roomId={roomId} />
            <ChessHome onGameOver={onGameOver} onReset={onReset} showGameCreation={false} />
          </div>
        </Card>
      </div>
    </div>
  )
}
