"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  CreateRoomClient,
  CreateRoomResponse,
  PublicRoomsPayload,
  PublicRoomSummary,
  PublicRoomVisibility,
} from "@chess/pages/api/socket"
import { usePlayerState } from "@chess/state/player"
import { useSocketState, useSockets } from "@chess/utils/socket"

const filterAlphanumeric = (value: string) => value.replace(/[^a-zA-Z0-9 ]/g, "")
const filterDigits = (value: string) => value.replace(/[^0-9]/g, "")

export default function ChessLobbyPage() {
  const router = useRouter()

  const username = usePlayerState((s) => s.username)
  const hydrated = usePlayerState((s) => s.hydrated)
  const id = usePlayerState((s) => s.id)
  const setRoom = usePlayerState.getState().setRoom
  const setJoinedRoom = usePlayerState.getState().setJoinedRoom
  const hydrateFromStorage = usePlayerState.getState().hydrateFromStorage

  useEffect(() => {
    setJoinedRoom(false)
    setRoom("")
    hydrateFromStorage()
  }, [hydrateFromStorage, setJoinedRoom, setRoom])

  useEffect(() => {
    if (hydrated && username.length < 3) router.replace("/chess/name")
  }, [hydrated, router, username])

  const reset = useCallback(() => {}, [])
  useSockets({ reset })
  const socket = useSocketState((s) => s.socket)

  const [onlineCount, setOnlineCount] = useState(0)
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([])

  const [createName, setCreateName] = useState("")
  const [timeControl, setTimeControl] = useState<CreateRoomClient["timeControl"]>("15m")
  const [visibility, setVisibility] = useState<PublicRoomVisibility>("public")
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [joinCode, setJoinCode] = useState("")

  useEffect(() => {
    if (!socket) return

    const onUpdate = (payload: PublicRoomsPayload) => {
      setOnlineCount(payload.onlineCount)
      setRooms(payload.rooms)
    }

    socket.on("publicRoomsUpdated", onUpdate)
    socket.emit("fetchPublicRooms")

    return () => {
      socket.off("publicRoomsUpdated", onUpdate)
    }
  }, [socket])

  const createNameNormalized = useMemo(() => filterAlphanumeric(createName).trim().slice(0, 30), [createName])
  const canCreate = createNameNormalized.length >= 3 && !creating && username.length >= 3

  const joinCodeNormalized = useMemo(() => filterDigits(joinCode).slice(0, 5), [joinCode])
  const canJoinCode = joinCodeNormalized.length === 5

  const goToRoom = (roomId: string) => {
    router.push(`/chess/room/${roomId}`)
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] bg-gradient-to-br from-background via-background to-primary/5 p-3 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold glow-text">Chess Lobby</h1>
            <p className="text-muted-foreground">Create a room or join an existing one.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/chess/name">
              <Button variant="outline" className="border-border bg-transparent">
                Change Name
              </Button>
            </Link>
            <Link href="/games">
              <Button variant="outline" className="border-border bg-transparent">
                Back to Games
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <Card className="bg-card/50 border-border/50 backdrop-blur p-6">
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-bold">Create a Game</div>
                  <div className="text-sm text-muted-foreground mt-1">Hosting as {username}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Room Name</div>
                  <Input
                    value={createName}
                    onChange={(e) => {
                      setCreateError(null)
                      setCreateName(e.target.value)
                    }}
                    placeholder="Grandmaster's Den"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Time Control</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["10m", "15m", "30m"] as const).map((t) => (
                      <Button
                        key={t}
                        type="button"
                        variant={timeControl === t ? "default" : "outline"}
                        className={timeControl === t ? "" : "bg-transparent"}
                        onClick={() => setTimeControl(t)}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Visibility</div>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value === "private" ? "private" : "public")}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private (code only)</option>
                  </select>
                </div>

                {createError ? <div className="text-sm text-destructive">{createError}</div> : null}

                <Button
                  disabled={!canCreate || !socket}
                  onClick={() => {
                    if (!socket) return
                    if (createNameNormalized.length < 3) return
                    if (username.length < 3) return

                    setCreating(true)
                    const payload: CreateRoomClient = {
                      displayName: createNameNormalized,
                      host: `${username}#${id}`,
                      visibility,
                      timeControl,
                    }

                    let finished = false
                    const timeoutId = window.setTimeout(() => {
                      if (finished) return
                      finished = true
                      setCreating(false)
                      setCreateError("Could not reach the game server. Please refresh and try again.")
                    }, 6000)

                    socket.emit("createRoom", payload, (res: CreateRoomResponse) => {
                      if (finished) return
                      finished = true
                      window.clearTimeout(timeoutId)
                      setCreating(false)
                      if (!res.ok) {
                        setCreateError(res.error)
                        return
                      }
                      goToRoom(res.roomId)
                    })
                  }}
                >
                  {creating ? "Launching..." : "Launch Room"}
                </Button>
              </div>
            </Card>

            <Card className="bg-card/50 border-border/50 backdrop-blur p-6">
              <div className="space-y-4">
                <div>
                  <div className="text-xl font-bold">Join via Code</div>
                  <div className="text-sm text-muted-foreground mt-1">Enter a 5-digit room ID.</div>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="00000"
                    inputMode="numeric"
                  />
                  <Button
                    variant="secondary"
                    disabled={!canJoinCode}
                    onClick={() => {
                      if (!canJoinCode) return
                      goToRoom(joinCodeNormalized)
                    }}
                  >
                    Join
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <Card className="bg-card/50 border-border/50 backdrop-blur overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 p-6">
              <div>
                <div className="text-2xl font-bold">Public Rooms</div>
                <div className="text-sm text-muted-foreground mt-1">Join an active match and start playing.</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">{onlineCount} online</div>
                <Button
                  variant="outline"
                  className="border-border bg-transparent"
                  disabled={!socket}
                  onClick={() => socket?.emit("fetchPublicRooms")}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Room ID</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No public rooms yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  rooms.map((room) => (
                    <TableRow key={room.roomId}>
                      <TableCell className="px-6 font-mono">#{room.roomId}</TableCell>
                      <TableCell>{room.host}</TableCell>
                      <TableCell>{room.timeControl}</TableCell>
                      <TableCell>
                        {room.players}/2 {room.isFull ? <span className="text-destructive">FULL</span> : null}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          size="sm"
                          disabled={room.isFull}
                          onClick={() => goToRoom(room.roomId)}
                        >
                          {room.isFull ? "Full" : "Join"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  )
}
