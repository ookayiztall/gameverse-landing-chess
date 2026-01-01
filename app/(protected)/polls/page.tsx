"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Clock, CheckCircle2 } from "lucide-react"

interface Poll {
  id: string
  question: string
  description: string | null
  ends_at: string
  is_active: boolean
  created_at: string
  options: PollOption[]
  user_vote: string | null
  total_votes: number
}

interface PollOption {
  id: string
  option_text: string
  vote_count: number
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [currentUserId, setCurrentUserId] = useState("")
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchCurrentUser()
    fetchPolls()
  }, [])

  async function fetchCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  async function fetchPolls() {
    const { data: pollsData } = await supabase
      .from("polls")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (pollsData) {
      const pollsWithOptions = await Promise.all(
        pollsData.map(async (poll) => {
          const { data: options } = await supabase.from("poll_options").select("*").eq("poll_id", poll.id).order("id")

          const { data: userVote } = await supabase
            .from("poll_votes")
            .select("option_id")
            .eq("poll_id", poll.id)
            .eq("user_id", currentUserId)
            .single()

          const totalVotes = options?.reduce((sum, opt) => sum + opt.vote_count, 0) || 0

          return {
            ...poll,
            options: options || [],
            user_vote: userVote?.option_id || null,
            total_votes: totalVotes,
          }
        }),
      )

      setPolls(pollsWithOptions)
    }
  }

  async function vote(pollId: string, optionId: string) {
    if (!currentUserId) return

    const { error } = await supabase.from("poll_votes").insert({
      poll_id: pollId,
      option_id: optionId,
      user_id: currentUserId,
    })

    if (!error) {
      // Update vote count
      const poll = polls.find((p) => p.id === pollId)
      const option = poll?.options.find((o) => o.id === optionId)
      if (option) {
        await supabase
          .from("poll_options")
          .update({ vote_count: option.vote_count + 1 })
          .eq("id", optionId)
      }

      fetchPolls()
    }
  }

  const isPollExpired = (endsAt: string) => new Date(endsAt) < new Date()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-balance mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Community Polls</span>
        </h1>
        <p className="text-muted-foreground">Share your opinion and see what the community thinks</p>
      </div>

      <div className="grid gap-6">
        {polls.map((poll) => {
          const hasVoted = !!poll.user_vote
          const isExpired = isPollExpired(poll.ends_at)
          const showResults = hasVoted || isExpired

          return (
            <Card key={poll.id} className="border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <CardTitle>{poll.question}</CardTitle>
                    </div>
                    {poll.description && <CardDescription>{poll.description}</CardDescription>}
                  </div>
                  {isExpired ? (
                    <Badge variant="outline" className="bg-gray-500/10">
                      Ended
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showResults ? (
                  // Voting options
                  <div className="space-y-2">
                    {poll.options.map((option) => (
                      <Button
                        key={option.id}
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3 bg-transparent"
                        onClick={() => vote(poll.id, option.id)}
                        disabled={isExpired}
                      >
                        {option.option_text}
                      </Button>
                    ))}
                  </div>
                ) : (
                  // Results
                  <div className="space-y-3">
                    {poll.options.map((option) => {
                      const percentage = poll.total_votes > 0 ? (option.vote_count / poll.total_votes) * 100 : 0
                      const isUserChoice = option.id === poll.user_vote

                      return (
                        <div key={option.id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span>{option.option_text}</span>
                              {isUserChoice && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            </div>
                            <span className="text-muted-foreground">
                              {option.vote_count} votes ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {isExpired
                        ? `Ended ${new Date(poll.ends_at).toLocaleDateString()}`
                        : `Ends ${new Date(poll.ends_at).toLocaleDateString()}`}
                    </span>
                  </div>
                  {showResults && <span>{poll.total_votes} total votes</span>}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {polls.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              No active polls at the moment. Check back later!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
