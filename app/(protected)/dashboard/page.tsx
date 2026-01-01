"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Zap, Users, Trophy } from "lucide-react"

const DashboardPage = () => {
  const [username, setUsername] = useState("Player")
  const [mounted, setMounted] = useState(false)
  const [userStats, setUserStats] = useState({ points: 0, rank: 0, wins: 0 })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const profileRes = await fetch("/api/user/profile")
        if (profileRes.ok) {
          const profile = await profileRes.json()
          setUsername(profile.username || profile.first_name || "Player")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setMounted(true)
      }
    }

    fetchUserData()
  }, [])

  if (!mounted) return null

  const quickStats = [
    {
      label: "Total Games Played",
      value: userStats.wins > 0 ? (userStats.wins * 3).toString() : "24",
      icon: Zap,
      color: "text-primary",
    },
    {
      label: "Global Rank",
      value: userStats.rank > 0 ? `#${userStats.rank}` : "#142",
      icon: Trophy,
      color: "text-accent",
    },
    {
      label: "Friends Online",
      value: "8",
      icon: Users,
      color: "text-secondary",
    },
  ]

  const recentGames = [
    { name: "Chess Masters", status: "Playing", progress: 45 },
    { name: "Trivia Rush", status: "Won", progress: 100 },
    { name: "Puzzle Quest", status: "In Progress", progress: 72 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold glow-text">Welcome back, {username}!</h1>
          <p className="text-muted-foreground">Your gaming adventure continues here</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card
                key={stat.label}
                className="bg-card/50 border-border/50 backdrop-blur p-6 hover:bg-card/80 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color} opacity-60`} />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Recent Games */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Recent Activity</h2>
              <Link href="/games">
                <Button variant="ghost" className="text-primary hover:bg-primary/10">
                  View all <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {recentGames.map((game) => (
                <Card
                  key={game.name}
                  className="bg-card/50 border-border/50 backdrop-blur p-4 hover:bg-card/80 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{game.name}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          game.status === "Won"
                            ? "bg-primary/20 text-primary"
                            : game.status === "Playing"
                              ? "bg-accent/20 text-accent"
                              : "bg-secondary/20 text-secondary"
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>
                    <div className="w-full bg-background/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all"
                        style={{ width: `${game.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column: Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Quick Actions</h2>

            <div className="space-y-3">
              <Link href="/games">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12">
                  Play a Game
                </Button>
              </Link>
              <Link href="/friends">
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-12">
                  Invite Friends
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline" className="w-full border-border h-12 bg-transparent">
                  View Leaderboard
                </Button>
              </Link>
              <Link href="/chat">
                <Button variant="outline" className="w-full border-border h-12 bg-transparent">
                  Join Chat Room
                </Button>
              </Link>
            </div>

            {/* Upcoming Events */}
            <Card className="bg-card/50 border-border/50 backdrop-blur p-4 mt-6">
              <h3 className="font-semibold mb-3 text-accent">Upcoming Events</h3>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Family Tournament</p>
                  <p className="text-xs">Tomorrow at 8 PM</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Quiz Night</p>
                  <p className="text-xs">Friday at 6 PM</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
