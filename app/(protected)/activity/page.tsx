"use client"

import { useMemo, useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Star, Users, TrendingUp, Gamepad, Award } from "lucide-react"
import { ReactionButton } from "@/components/reaction-button"
import { getAvatarUrl } from "@/lib/utils"

interface Activity {
  id: string
  user_id: string
  activity_type: string
  description: string
  metadata: any
  created_at: string
  profile: {
    username: string
    avatar_url: string | null
  }
  reactions?: any[]
}

const activityIcons = {
  game_played: Gamepad,
  achievement_unlocked: Award,
  friend_added: Users,
  level_up: TrendingUp,
  tournament_won: Trophy,
  high_score: Star,
}

const activityColors = {
  game_played: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  achievement_unlocked: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  friend_added: "bg-green-500/10 text-green-500 border-green-500/20",
  level_up: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  tournament_won: "bg-red-500/10 text-red-500 border-red-500/20",
  high_score: "bg-orange-500/10 text-orange-500 border-orange-500/20",
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [friendActivities, setFriendActivities] = useState<Activity[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const supabase = useMemo(() => createBrowserClient(), [])

  const attachProfiles = async (rows: any[]) => {
    const userIds = Array.from(new Set((rows || []).map((r) => r.user_id).filter(Boolean)))
    if (userIds.length === 0) {
      return (rows || []).map((r) => ({ ...r, profile: { username: "Unknown", avatar_url: null } })) as Activity[]
    }

    const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
    const profilesById = new Map<string, { username: string; avatar_url: string | null }>(
      (profiles || []).map((p) => [p.id, { username: p.username || "Unknown", avatar_url: p.avatar_url || null }]),
    )

    return (rows || []).map((r) => ({
      ...r,
      profile: profilesById.get(r.user_id) || { username: "Unknown", avatar_url: null },
    })) as Activity[]
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchActivities()
    fetchFriendActivities()

    // Subscribe to new activities
    const channel = supabase
      .channel("activities")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activities",
        },
        () => {
          fetchActivities()
          fetchFriendActivities()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  async function fetchActivities() {
    const { data } = await supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(50)
    setActivities(await attachProfiles(data || []))
  }

  async function fetchFriendActivities() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Get friend IDs
    const { data: friends } = await supabase
      .from("friendships")
      .select("user_id, friend_id")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    if (!friends || friends.length === 0) return

    const friendIds = friends.map((f: any) => (f.user_id === user.id ? f.friend_id : f.user_id))

    const { data } = await supabase
      .from("activities")
      .select("*")
      .in("user_id", friendIds)
      .order("created_at", { ascending: false })
      .limit(50)

    setFriendActivities(await attachProfiles(data || []))
  }

  const ActivityCard = ({ activity }: { activity: Activity }) => {
    const Icon = activityIcons[activity.activity_type as keyof typeof activityIcons] || Star
    const colorClass = activityColors[activity.activity_type as keyof typeof activityColors] || ""
    const avatarUrl = getAvatarUrl(activity.profile.avatar_url)

    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg border ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={activity.profile.username} />}
                    <AvatarFallback>{activity.profile.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">{activity.profile.username}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString()}</span>
              </div>

              <p className="text-sm mb-3">{activity.description}</p>

              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {activity.metadata.game && <Badge variant="outline">{activity.metadata.game}</Badge>}
                  {activity.metadata.score && <Badge variant="outline">Score: {activity.metadata.score}</Badge>}
                  {activity.metadata.level && <Badge variant="outline">Level {activity.metadata.level}</Badge>}
                </div>
              )}

              <ReactionButton targetType="activity" targetId={activity.id} currentUserId={currentUserId} />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-balance mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Activity Feed</span>
        </h1>
        <p className="text-muted-foreground">See what's happening in the GameVerse community</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="all">All Activity</TabsTrigger>
          <TabsTrigger value="friends">Friends Only</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
            {activities.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No activities yet. Start playing games to see activity!
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="friends">
          <div className="space-y-4">
            {friendActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
            {friendActivities.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No friend activities yet. Add friends to see their activity!
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
