"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Calendar, Users, Medal } from "lucide-react"
import Link from "next/link"

interface Tournament {
  id: string
  name: string
  description: string
  game_id: string
  start_date: string
  end_date: string
  max_participants: number
  status: string
  prize_description: string
  created_at: string
  game: {
    title: string
  }
  participant_count: number
  is_participant: boolean
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const [filter, setFilter] = useState("all")
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchCurrentUser()
    fetchTournaments()
  }, [filter])

  async function fetchCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  async function fetchTournaments() {
    let query = supabase
      .from("tournaments")
      .select(
        `
        *,
        game:games(title)
      `,
        { count: "exact" },
      )
      .order("start_date", { ascending: true })

    if (filter === "upcoming") {
      query = query.eq("status", "upcoming")
    } else if (filter === "active") {
      query = query.eq("status", "in_progress")
    } else if (filter === "completed") {
      query = query.eq("status", "completed")
    }

    const { data } = await query

    if (data) {
      // Fetch participant counts and check if user is participant
      const tournamentsWithData = await Promise.all(
        data.map(async (tournament) => {
          const { count } = await supabase
            .from("tournament_participants")
            .select("*", { count: "exact", head: true })
            .eq("tournament_id", tournament.id)

          const { data: participation } = await supabase
            .from("tournament_participants")
            .select("id")
            .eq("tournament_id", tournament.id)
            .eq("user_id", currentUserId)
            .single()

          return {
            ...tournament,
            participant_count: count || 0,
            is_participant: !!participation,
          }
        }),
      )

      setTournaments(tournamentsWithData)
    }
  }

  async function joinTournament(tournamentId: string) {
    if (!currentUserId) return

    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournamentId,
      user_id: currentUserId,
    })

    if (!error) {
      fetchTournaments()
    }
  }

  async function leaveTournament(tournamentId: string) {
    await supabase
      .from("tournament_participants")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("user_id", currentUserId)

    fetchTournaments()
  }

  const statusColors = {
    upcoming: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_progress: "bg-green-500/10 text-green-500 border-green-500/20",
    completed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-balance mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Tournaments</span>
        </h1>
        <p className="text-muted-foreground">Compete in exciting gaming tournaments and win prizes</p>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setFilter}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          <div className="grid gap-4">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <CardTitle>{tournament.name}</CardTitle>
                      </div>
                      <CardDescription>{tournament.description}</CardDescription>
                    </div>
                    <Badge className={statusColors[tournament.status as keyof typeof statusColors]}>
                      {tournament.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {new Date(tournament.start_date).toLocaleDateString()} -{" "}
                        {new Date(tournament.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {tournament.participant_count}
                        {tournament.max_participants ? `/${tournament.max_participants}` : ""} participants
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Medal className="h-4 w-4 text-muted-foreground" />
                      <span>{tournament.game.title}</span>
                    </div>
                  </div>

                  {tournament.prize_description && (
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <p className="text-sm">
                        <strong>Prize:</strong> {tournament.prize_description}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {tournament.status === "upcoming" && (
                      <>
                        {tournament.is_participant ? (
                          <Button variant="outline" onClick={() => leaveTournament(tournament.id)}>
                            Leave Tournament
                          </Button>
                        ) : (
                          <Button
                            onClick={() => joinTournament(tournament.id)}
                            disabled={
                              tournament.max_participants > 0 &&
                              tournament.participant_count >= tournament.max_participants
                            }
                          >
                            Join Tournament
                          </Button>
                        )}
                      </>
                    )}
                    <Link href={`/tournaments/${tournament.id}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}

            {tournaments.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No tournaments found. Check back later for new competitions!
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
