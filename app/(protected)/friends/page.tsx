"use client"

import { useMemo, useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, MessageCircle, UserX, Check, X, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getAvatarUrl } from "@/lib/utils"

interface Friend {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  friend_user_id: string
  profile: {
    username: string
    avatar_url: string | null
  }
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([])
  const [sentRequests, setSentRequests] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])
  const { toast } = useToast()

  useEffect(() => {
    fetchFriends()
  }, [])

  async function fetchFriends() {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Fetch accepted friends
    const { data: acceptedFriends } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    // Fetch pending requests (received)
    const { data: pending } = await supabase.from("friendships").select("*").eq("friend_id", user.id).eq("status", "pending")

    // Fetch sent requests
    const { data: sent } = await supabase.from("friendships").select("*").eq("user_id", user.id).eq("status", "pending")

    const profileIds = Array.from(
      new Set([
        ...(acceptedFriends || []).map((f) => (f.user_id === user.id ? f.friend_id : f.user_id)),
        ...(pending || []).map((f) => f.user_id),
        ...(sent || []).map((f) => f.friend_id),
      ]),
    )

    const { data: profiles } = await supabase.from("profiles").select("id, username, first_name, avatar_url").in("id", profileIds)
    const profilesById = new Map<string, { username: string; avatar_url: string | null }>(
      (profiles || []).map((p) => [
        p.id,
        { username: p.username || p.first_name || "Unknown", avatar_url: p.avatar_url || null },
      ]),
    )

    setFriends(
      (acceptedFriends || []).map((f) => ({
        ...f,
        friend_user_id: f.user_id === user.id ? f.friend_id : f.user_id,
        profile:
          profilesById.get(f.user_id === user.id ? f.friend_id : f.user_id) || { username: "Unknown", avatar_url: null },
      })),
    )
    setPendingRequests(
      (pending || []).map((f) => ({
        ...f,
        friend_user_id: f.user_id,
        profile: profilesById.get(f.user_id) || { username: "Unknown", avatar_url: null },
      })),
    )
    setSentRequests(
      (sent || []).map((f) => ({
        ...f,
        friend_user_id: f.friend_id,
        profile: profilesById.get(f.friend_id) || { username: "Unknown", avatar_url: null },
      })),
    )
    setLoading(false)
  }

  async function searchUsers() {
    if (!searchQuery.trim()) return

    const { data } = await supabase
      .from("profiles")
      .select("id, username, first_name, avatar_url")
      .or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%`)
      .limit(10)

    setSearchResults(data || [])
  }

  async function sendFriendRequest(friendId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (friendId === user.id) {
      toast({ title: "Error", description: "You can’t add yourself.", variant: "destructive" })
      return
    }

    const { data: existing, error: existingError } = await supabase
      .from("friendships")
      .select("id,status,user_id,friend_id")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`,
      )
      .limit(1)

    if (existingError) {
      toast({ title: "Error", description: "Failed to check existing friendship.", variant: "destructive" })
      return
    }

    const match = existing?.[0]
    if (match?.status === "accepted") {
      toast({ title: "Already friends", description: "You’re already connected." })
      return
    }

    if (match?.status === "pending" && match.user_id === user.id) {
      toast({ title: "Request already sent", description: "Waiting for them to accept." })
      return
    }

    if (match?.status === "pending" && match.friend_id === user.id) {
      const { error: acceptError } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", match.id)
      if (acceptError) {
        toast({ title: "Error", description: "Failed to accept request.", variant: "destructive" })
        return
      }

      toast({ title: "Friend added", description: "Friend request accepted." })
      setSearchResults([])
      setSearchQuery("")
      fetchFriends()
      return
    }

    const { error } = await supabase.from("friendships").upsert(
      {
        user_id: user.id,
        friend_id: friendId,
        status: "pending",
      },
      { onConflict: "user_id,friend_id", ignoreDuplicates: true },
    )

    if (!error) {
      setSearchResults([])
      setSearchQuery("")
      fetchFriends()
      toast({ title: "Friend request sent" })
      return
    }

    toast({ title: "Error", description: "Failed to send friend request.", variant: "destructive" })
  }

  async function acceptFriendRequest(friendshipId: string) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId)

    fetchFriends()
  }

  async function rejectFriendRequest(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId)

    fetchFriends()
  }

  async function removeFriend(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId)

    fetchFriends()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-balance mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Friends</span>
        </h1>
        <p className="text-muted-foreground">Manage your gaming friends and connections</p>
      </div>

      <div className="grid gap-6">
        {/* Search Section */}
        <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Find Friends</CardTitle>
            <CardDescription>Search for users to add as friends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                className="flex-1"
              />
              <Button onClick={searchUsers}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((user) => {
                  const displayUsername = user.username || user.first_name || "Unknown"
                  const avatarUrl = getAvatarUrl(user.avatar_url)
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayUsername} />}
                          <AvatarFallback>{displayUsername[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{displayUsername}</span>
                      </div>
                      <Button size="sm" onClick={() => sendFriendRequest(user.id)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Friend
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Friends List Tabs */}
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
            <TabsTrigger value="pending">Requests ({pendingRequests.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            <div className="grid gap-4">
              {friends.map((friend) => (
                <Card key={friend.id} className="border-primary/20">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {getAvatarUrl(friend.profile.avatar_url) && (
                          <AvatarImage src={getAvatarUrl(friend.profile.avatar_url) as string} alt={friend.profile.username} />
                        )}
                        <AvatarFallback>{friend.profile.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{friend.profile.username}</p>
                        <p className="text-sm text-muted-foreground">
                          Friends since {new Date(friend.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/messages?user=${friend.friend_user_id}`)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeFriend(friend.id)}>
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {friends.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No friends yet. Start searching to add some!
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <div className="grid gap-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-accent/20">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {getAvatarUrl(request.profile.avatar_url) && (
                          <AvatarImage src={getAvatarUrl(request.profile.avatar_url) as string} alt={request.profile.username} />
                        )}
                        <AvatarFallback>{request.profile.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{request.profile.username}</p>
                        <p className="text-sm text-muted-foreground">Sent you a friend request</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acceptFriendRequest(request.id)}>
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectFriendRequest(request.id)}>
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pendingRequests.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No pending friend requests
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sent" className="mt-4">
            <div className="grid gap-4">
              {sentRequests.map((request) => (
                <Card key={request.id} className="border-border/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {getAvatarUrl(request.profile.avatar_url) && (
                          <AvatarImage src={getAvatarUrl(request.profile.avatar_url) as string} alt={request.profile.username} />
                        )}
                        <AvatarFallback>{request.profile.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{request.profile.username}</p>
                        <p className="text-sm text-muted-foreground">Waiting for response...</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => rejectFriendRequest(request.id)}>
                      Cancel Request
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {sentRequests.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground">No pending sent requests</CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
