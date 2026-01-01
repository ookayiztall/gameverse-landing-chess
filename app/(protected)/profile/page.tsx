"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Trophy, Users, Zap, Edit2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import { getAvatarUrl } from "@/lib/utils"

const statsData = [
  { month: "Jan", wins: 12, losses: 8 },
  { month: "Feb", wins: 15, losses: 6 },
  { month: "Mar", wins: 18, losses: 5 },
  { month: "Apr", wins: 14, losses: 9 },
  { month: "May", wins: 20, losses: 4 },
]

type Profile = {
  username: string | null
  first_name: string | null
  last_name: string | null
  bio: string | null
  avatar_url: string | null
  theme: string | null
  created_at?: string | null
}

type FriendDisplay = {
  id: string
  username: string
  avatar_url: string | null
  isOnline: boolean
}

type PerGameStat = {
  game: string
  plays: number
  bestScore: number | null
  totalScore: number | null
  lastPlayedAt: string | null
}

type AchievementDisplay = {
  id: string
  title: string
  description: string | null
  badge_icon: string | null
  unlocked: boolean
  unlocked_at: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userStats, setUserStats] = useState({ points: 0, total_wins: 0, total_losses: 0, win_streak: 0 })
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    bio: "",
    avatar_url: "",
    theme: "dark",
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [friends, setFriends] = useState<FriendDisplay[]>([])
  const [friendsCount, setFriendsCount] = useState<number>(0)
  const [tournamentsWon, setTournamentsWon] = useState<number>(0)
  const [perGameStats, setPerGameStats] = useState<PerGameStat[]>([])
  const [achievements, setAchievements] = useState<AchievementDisplay[]>([])
  const { toast } = useToast()
  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/user/profile")
        if (!res.ok) return
        const data = (await res.json()) as Profile
        setProfile(data)
        setForm({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          theme: data.theme || "dark",
        })
      } catch {
        setProfile(null)
      } finally {
        setLoading(false)
        setMounted(true)
      }
    }

    const fetchStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: stats } = await supabase
          .from("user_stats")
          .select("points, total_wins, total_losses, win_streak")
          .eq("user_id", user.id)
          .maybeSingle()

        setUserStats({
          points: Number(stats?.points ?? 0) || 0,
          total_wins: Number(stats?.total_wins ?? 0) || 0,
          total_losses: Number(stats?.total_losses ?? 0) || 0,
          win_streak: Number(stats?.win_streak ?? 0) || 0,
        })

        const res = await fetch("/api/leaderboard?timeframe=all")
        if (!res.ok) return
        const rows = (await res.json()) as any[]
        const idx = rows.findIndex((r) => (r?.user_id || r?.id) === user.id)
        setLeaderboardRank(idx >= 0 ? idx + 1 : null)
      } catch {
        setLeaderboardRank(null)
      }
    }

    const fetchSocialAndGameStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: friendshipRows } = await supabase
          .from("friendships")
          .select("id, user_id, friend_id, status, updated_at")
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq("status", "accepted")

        const friendIds = Array.from(
          new Set(
            (friendshipRows || [])
              .map((row: any) => (row.user_id === user.id ? row.friend_id : row.user_id))
              .filter(Boolean),
          ),
        ) as string[]

        setFriendsCount(friendIds.length)

        if (friendIds.length > 0) {
          const [{ data: friendProfiles }, { data: activeVoiceSessions }] = await Promise.all([
            supabase.from("profiles").select("id, username, avatar_url").in("id", friendIds),
            supabase.from("voice_sessions").select("user_id, joined_at").in("user_id", friendIds).eq("is_active", true),
          ])

          const onlineSet = new Set((activeVoiceSessions || []).map((s: any) => s.user_id).filter(Boolean))
          const nextFriends = (friendProfiles || [])
            .map((p: any) => ({
              id: p.id,
              username: (p.username || "Unknown") as string,
              avatar_url: (p.avatar_url || null) as string | null,
              isOnline: onlineSet.has(p.id),
            }))
            .sort((a: FriendDisplay, b: FriendDisplay) => {
              if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1
              return a.username.localeCompare(b.username)
            })

          setFriends(nextFriends)
        } else {
          setFriends([])
        }

        const { data: myParticipation } = await supabase
          .from("tournament_participants")
          .select("tournament_id, score, tournament:tournaments(status)")
          .eq("user_id", user.id)

        const completedTournamentIds = Array.from(
          new Set(
            (myParticipation || [])
              .filter((r: any) => r?.tournament?.status === "completed")
              .map((r: any) => r.tournament_id)
              .filter(Boolean),
          ),
        ) as string[]

        if (completedTournamentIds.length > 0) {
          const { data: allParticipants } = await supabase
            .from("tournament_participants")
            .select("tournament_id, user_id, score")
            .in("tournament_id", completedTournamentIds)

          const byTournament = new Map<string, { maxScore: number; userScore: number | null }>()
          for (const row of allParticipants || []) {
            const tournamentId = (row as any).tournament_id as string | undefined
            const userId = (row as any).user_id as string | undefined
            if (!tournamentId || !userId) continue

            const score = Number((row as any).score ?? 0) || 0
            const cur = byTournament.get(tournamentId) || { maxScore: Number.NEGATIVE_INFINITY, userScore: null }
            cur.maxScore = Math.max(cur.maxScore, score)
            if (userId === user.id) cur.userScore = score
            byTournament.set(tournamentId, cur)
          }

          let wins = 0
          for (const { maxScore, userScore } of byTournament.values()) {
            if (userScore != null && userScore === maxScore) wins += 1
          }
          setTournamentsWon(wins)
        } else {
          setTournamentsWon(0)
        }

        const { data: activityRows } = await supabase
          .from("activities")
          .select("activity_type, metadata, created_at")
          .eq("user_id", user.id)
          .in("activity_type", ["game_played", "high_score"])
          .order("created_at", { ascending: false })
          .limit(500)

        const perGame = new Map<string, PerGameStat>()
        for (const row of activityRows || []) {
          const metadata = (row as any)?.metadata as any
          const game = metadata?.game as string | undefined
          if (!game) continue

          const existing =
            perGame.get(game) || ({ game, plays: 0, bestScore: null, totalScore: null, lastPlayedAt: null } as PerGameStat)

          if ((row as any)?.activity_type === "game_played") existing.plays += 1

          const scoreValue = metadata?.score ?? metadata?.pointsDelta ?? metadata?.points
          let score: number | null = null
          if (typeof scoreValue === "number") score = scoreValue
          else if (typeof scoreValue === "string") {
            const direct = Number(scoreValue)
            if (Number.isFinite(direct)) score = direct
            else {
              const cleaned = Number(scoreValue.replace(/[^\d.-]/g, ""))
              if (Number.isFinite(cleaned)) score = cleaned
            }
          }

          if (score != null && Number.isFinite(score)) {
            existing.bestScore = existing.bestScore == null ? score : Math.max(existing.bestScore, score)
            existing.totalScore = existing.totalScore == null ? score : existing.totalScore + score
          }

          const createdAt = (row as any)?.created_at as string | undefined
          if (createdAt && (existing.lastPlayedAt == null || createdAt > existing.lastPlayedAt)) {
            existing.lastPlayedAt = createdAt
          }

          perGame.set(game, existing)
        }

        const nextPerGame = Array.from(perGame.values()).sort((a, b) => {
          const aTs = a.lastPlayedAt || ""
          const bTs = b.lastPlayedAt || ""
          if (aTs !== bTs) return bTs.localeCompare(aTs)
          return a.game.localeCompare(b.game)
        })
        setPerGameStats(nextPerGame)
      } catch {
        setFriends([])
        setFriendsCount(0)
        setTournamentsWon(0)
        setPerGameStats([])
      }
    }

    const fetchAchievements = async () => {
      try {
        const res = await fetch("/api/achievements")
        if (!res.ok) {
          setAchievements([])
          return
        }
        const data = (await res.json()) as AchievementDisplay[]
        setAchievements(Array.isArray(data) ? data : [])
      } catch {
        setAchievements([])
      }
    }

    void fetchProfile()
    void fetchStats()
    void fetchSocialAndGameStats()
    void fetchAchievements()
  }, [supabase])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null)
      return
    }

    const next = URL.createObjectURL(avatarFile)
    setAvatarPreviewUrl(next)

    return () => {
      URL.revokeObjectURL(next)
    }
  }, [avatarFile])

  if (!mounted) return null

  const displayName = (profile?.username || profile?.first_name || "Player").trim() || "Player"
  const handle = displayName.toLowerCase().replace(/\s+/g, "")
  const profileAvatarUrl = getAvatarUrl(profile?.avatar_url)
  const avatarPreviewSrc = avatarPreviewUrl || getAvatarUrl(form.avatar_url)
  const totalGamesPlayed = userStats.total_wins + userStats.total_losses
  const winRateText = totalGamesPlayed > 0 ? `${((userStats.total_wins / totalGamesPlayed) * 100).toFixed(1)}%` : "—"
  const joinedText =
    profile?.created_at != null ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null
  const onlineFriends = friends.filter((f) => f.isOnline)
  const displayPerGameStats =
    perGameStats.length > 0
      ? perGameStats
      : totalGamesPlayed > 0
        ? [{ game: "Black Jack", plays: totalGamesPlayed, bestScore: userStats.points, totalScore: userStats.points, lastPlayedAt: null }]
        : []

  const openEdit = () => {
    setForm({
      username: profile?.username || "",
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      bio: profile?.bio || "",
      avatar_url: profile?.avatar_url || "",
      theme: profile?.theme || "dark",
    })
    setAvatarFile(null)
    setEditOpen(true)
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      let avatarUrl = form.avatar_url.trim() || null

      if (avatarFile) {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          toast({ title: "Error", description: "You must be logged in to upload an avatar.", variant: "destructive" })
          return
        }

        const extension = avatarFile.name.split(".").pop() || "png"
        const filePath = `${user.id}/avatar.${extension}`

        const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type || "image/png",
        })

        if (uploadError) {
          const message = String(uploadError.message || "")
          const lower = message.toLowerCase()

          if (lower.includes("bucket not found")) {
            toast({
              title: "Avatar upload isn't configured",
              description: "Supabase Storage bucket 'avatars' does not exist. Create it in Supabase → Storage → New bucket.",
              variant: "destructive",
            })
            return
          }

          if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("not authorized")) {
            toast({
              title: "Avatar upload blocked",
              description: "Supabase Storage policies for the 'avatars' bucket are missing/denying uploads.",
              variant: "destructive",
            })
            return
          }

          toast({ title: "Error", description: message || "Failed to upload avatar.", variant: "destructive" })
          return
        }

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)
        avatarUrl = urlData.publicUrl || null
      }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim() || null,
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          bio: form.bio.trim() || null,
          avatar_url: getAvatarUrl(avatarUrl),
          theme: form.theme || "dark",
        }),
      })

      if (!res.ok) {
        toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" })
        return
      }

      const updated = (await res.json()) as Profile
      setProfile(updated)
      setAvatarFile(null)
      setEditOpen(false)
      toast({ title: "Profile updated" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Profile Header */}
        <Card className="bg-gradient-to-r from-primary/20 via-card/50 to-accent/20 border-primary/30 backdrop-blur overflow-hidden">
          <div className="relative p-8">
            {/* Avatar */}
            <div className="flex items-end gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-5xl border-4 border-background shadow-lg">
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{displayName[0]?.toUpperCase() || "P"}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
                <p className="text-muted-foreground">
                  @{handle}
                  {joinedText ? ` | Joined ${joinedText}` : ""}
                </p>
              </div>

              {/* Edit Button */}
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2" onClick={openEdit} disabled={loading}>
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            </div>

            {/* Stats Bar */}
            <div className="mt-8 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Global Rank</p>
                <p className="text-2xl font-bold text-primary mt-1">{leaderboardRank != null ? `#${leaderboardRank}` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Points</p>
                <p className="text-2xl font-bold text-accent mt-1">{userStats.points.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</p>
                <p className="text-2xl font-bold text-secondary mt-1">{winRateText}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Performance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            <Card className="bg-card/50 border-border/50 backdrop-blur p-6">
              <h2 className="text-xl font-bold mb-4">Performance</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15,15,35,0.8)",
                      border: "1px solid rgba(88,86,214,0.3)",
                    }}
                  />
                  <Bar dataKey="wins" fill="rgba(88,86,214,0.8)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="losses" fill="rgba(167,107,207,0.4)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-card/50 border-border/50 backdrop-blur p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold">Games Played</h2>
                <Button variant="outline" className="border-border bg-transparent" onClick={() => router.push("/games")}>
                  Browse Games
                </Button>
              </div>

              {displayPerGameStats.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-4">No per-game stats yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {displayPerGameStats.map((g) => (
                    <Card key={g.game} className="bg-card/40 border-border/40 backdrop-blur p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{g.game}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {g.bestScore != null ? `Best Score: ${g.bestScore.toLocaleString()}` : "Best Score: —"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {g.totalScore != null ? `Total Points: ${g.totalScore.toLocaleString()}` : "Total Points: —"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {g.plays > 0 ? `${g.plays.toLocaleString()} plays` : "— plays"}
                          </p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-primary/60 mt-1" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            {/* Achievements Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Achievements</h2>
              {achievements.length === 0 ? (
                <div className="text-sm text-muted-foreground">No achievements yet.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <Card
                      key={achievement.id}
                      className={`p-4 backdrop-blur transition-all ${
                        achievement.unlocked
                          ? "bg-card/50 border-border/50 hover:border-primary/30"
                          : "bg-card/30 border-border/30 opacity-50"
                      }`}
                    >
                      <p className={`text-2xl mb-2 ${achievement.unlocked ? "" : "grayscale"}`}>{achievement.badge_icon || "🏅"}</p>
                      <p className="font-semibold text-sm text-foreground">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{achievement.description || "—"}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Friends & Quick Stats */}
          <div className="space-y-6">
            {/* Quick Stats Cards */}
            <div className="space-y-3">
              {[
                { label: "Games", value: totalGamesPlayed.toLocaleString(), icon: Zap },
                { label: "Friends", value: friendsCount.toLocaleString(), icon: Users },
                { label: "Tournaments Won", value: tournamentsWon.toLocaleString(), icon: Trophy },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.label} className="bg-card/50 border-border/50 backdrop-blur p-4 min-h-[130px]">
                    <div className="flex flex-col items-center text-center h-full justify-between">
                      <div className="flex flex-col items-center">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold leading-none mt-4">{stat.value}</p>
                      </div>
                      <Icon className="w-6 h-6 text-primary opacity-60 mt-4" />
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Friends List */}
            <Card className="bg-card/50 border-border/50 backdrop-blur p-4">
              <h3 className="font-semibold mb-3">Friends Online</h3>
              <div className="space-y-2">
                {friends.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No friends yet.</div>
                ) : onlineFriends.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No friends online right now.</div>
                ) : (
                  onlineFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-2 rounded hover:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs overflow-hidden">
                          {friend.avatar_url ? (
                            <img src={getAvatarUrl(friend.avatar_url) || ""} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{friend.username[0]?.toUpperCase() || "?"}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{friend.username}</p>
                          <p className="text-xs text-muted-foreground truncate">online</p>
                        </div>
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          friend.isOnline ? "bg-green-500" : "bg-gray-500"
                        }`}
                      ></div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="outline" className="w-full mt-3 border-border bg-transparent" onClick={() => router.push("/friends")}>
                View All Friends
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update how others see you.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="avatar_file">Avatar</Label>
              {avatarPreviewSrc && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-card/50 border border-border">
                    <img src={avatarPreviewSrc} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{avatarFile?.name || "Current avatar"}</div>
                </div>
              )}
              <Input
                id="avatar_file"
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Theme</Label>
              <Select value={form.theme} onValueChange={(value) => setForm((prev) => ({ ...prev, theme: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
