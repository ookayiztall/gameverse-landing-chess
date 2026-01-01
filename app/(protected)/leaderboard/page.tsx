"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LeaderboardTable } from "@/components/leaderboard-table"
import { Trophy, TrendingUp, Users } from "lucide-react"

type Timeframe = "Weekly" | "Monthly" | "All Time"

const topStats = [
  {
    label: "Total Players",
    value: "2,543",
    icon: Users,
    color: "text-secondary",
  },
  {
    label: "Games Played",
    value: "48.2K",
    icon: Trophy,
    color: "text-primary",
  },
  {
    label: "Avg. Win Rate",
    value: "42.3%",
    icon: TrendingUp,
    color: "text-accent",
  },
]

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("Weekly")
  const [leaderboardData, setLeaderboardData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`/api/leaderboard?timeframe=${timeframe.toLowerCase()}`)
        if (response.ok) {
          const data = await response.json()
          setLeaderboardData(
            data.map((entry: any, index: number) => ({
              rank: index + 1,
              username: entry.profiles?.username || `Player ${index + 1}`,
              avatar: "🎮",
              points: entry.points || 0,
              wins: entry.total_wins || 0,
              streak: entry.win_streak || 0,
            })),
          )
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [timeframe])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-accent" />
            <h1 className="text-4xl font-bold glow-text">Leaderboard</h1>
          </div>
          <p className="text-muted-foreground">Compete with friends and climb to the top</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card
                key={stat.label}
                className="bg-card/50 border-border/50 backdrop-blur p-4 hover:bg-card/80 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon className={`w-6 h-6 ${stat.color} opacity-60`} />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2 flex-wrap">
          {(["Weekly", "Monthly", "All Time"] as const).map((tf) => (
            <Button
              key={tf}
              onClick={() => setTimeframe(tf)}
              variant={timeframe === tf ? "default" : "outline"}
              className={`${
                timeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "border-border bg-transparent hover:bg-primary/10"
              }`}
            >
              {tf}
            </Button>
          ))}
        </div>

        {/* Leaderboard Table */}
        {loading ? <p>Loading...</p> : <LeaderboardTable entries={leaderboardData} timeframe={timeframe} />}

        {/* Your Rank Card */}
        <Card className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-card/50 to-accent/20 border-primary/30 backdrop-blur p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Your Current Rank</p>
              <p className="text-2xl font-bold mt-1">
                #3 • <span className="text-accent">3,220 points</span>
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-muted-foreground">Next Rank In</p>
              <p className="text-lg font-semibold text-secondary">630 points</p>
            </div>
          </div>
        </Card>

        {/* Badges Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Achievements & Badges</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "🔥", name: "Hot Streak", desc: "5-win streak" },
              { emoji: "🎯", name: "Sharp Shot", desc: "90% accuracy" },
              { emoji: "🏅", name: "Top 100", desc: "Rank in top 100" },
              { emoji: "🌟", name: "Star Player", desc: "1,000 wins" },
            ].map((badge) => (
              <Card
                key={badge.name}
                className="bg-card/50 border-border/50 backdrop-blur p-4 text-center hover:border-primary/30 transition-all"
              >
                <p className="text-3xl mb-2">{badge.emoji}</p>
                <p className="font-semibold text-sm text-foreground">{badge.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{badge.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
