"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, ArrowLeft } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { getAvatarUrl } from "@/lib/utils"

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
  sender_profile?: {
    username: string
  }
}

interface Conversation {
  user_id: string
  username: string
  avatar_url?: string | null
  last_message: string
  last_message_time: string
  unread_count: number
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    fetchCurrentUser()
    fetchConversations()

    // Check if there's a user param to start conversation with
    const userParam = searchParams.get("user")
    if (userParam) {
      setSelectedUser(userParam)
    }
  }, [])

  useEffect(() => {
    if (selectedUser && currentUserId) {
      fetchMessages()
      markMessagesAsRead()

      // Subscribe to new messages
      const inbound = supabase
        .channel(`messages-in:${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
            filter: `recipient_id=eq.${currentUserId}`,
          },
          (payload) => {
            if (payload.new.sender_id === selectedUser) {
              fetchMessages()
            }
            fetchConversations()
          },
        )
        .subscribe()

      const outbound = supabase
        .channel(`messages-out:${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
            filter: `sender_id=eq.${currentUserId}`,
          },
          (payload) => {
            const otherUserId = payload.new.recipient_id
            if (otherUserId === selectedUser) {
              fetchMessages()
            }
            fetchConversations()
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(inbound)
        supabase.removeChannel(outbound)
      }
    }
  }, [selectedUser, currentUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  async function fetchCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  async function fetchConversations() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Get all friends
    const { data: friends } = await supabase
      .from("friendships")
      .select("user_id, friend_id")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    if (!friends) return

    const friendIds = friends.map((f) => (f.user_id === user.id ? f.friend_id : f.user_id))
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, first_name, avatar_url")
      .in("id", friendIds)
    const usernamesById = new Map<string, string>((profiles || []).map((p) => [p.id, p.username || p.first_name || "Unknown"]))
    const avatarsById = new Map<string, string | null>((profiles || []).map((p) => [p.id, p.avatar_url || null]))

    // Get last message with each friend
    const conversationsData = await Promise.all(
      friends.map(async (friend) => {
        const friendId = friend.user_id === user.id ? friend.friend_id : friend.user_id
        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("content, created_at, sender_id")
          .or(
            `and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`,
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        const { count: unreadCount } = await supabase
          .from("direct_messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", friendId)
          .eq("recipient_id", user.id)
          .eq("read", false)

        return {
          user_id: friendId,
          username: usernamesById.get(friendId) || "Unknown",
          avatar_url: avatarsById.get(friendId) || null,
          last_message: lastMsg?.content || "No messages yet",
          last_message_time: lastMsg?.created_at || "",
          unread_count: unreadCount || 0,
        }
      }),
    )

    setConversations(
      conversationsData.sort(
        (a, b) =>
          (b.last_message_time ? new Date(b.last_message_time).getTime() : 0) -
          (a.last_message_time ? new Date(a.last_message_time).getTime() : 0),
      ),
    )
  }

  async function fetchMessages() {
    if (!selectedUser || !currentUserId) return

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},recipient_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},recipient_id.eq.${currentUserId})`,
      )
      .order("created_at", { ascending: true })

    setMessages(data || [])
  }

  async function markMessagesAsRead() {
    if (!selectedUser || !currentUserId) return

    const { error } = await supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("sender_id", selectedUser)
      .eq("recipient_id", currentUserId)
      .eq("read", false)

    if (!error) {
      fetchConversations()
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedUser || !currentUserId) return

    const { error } = await supabase.from("direct_messages").insert({
      sender_id: currentUserId,
      recipient_id: selectedUser,
      content: newMessage.trim(),
    })

    if (!error) {
      setNewMessage("")
      fetchMessages()
      fetchConversations()
    }
  }

  const selectedConversation = conversations.find((c) => c.user_id === selectedUser)
  const selectedAvatarUrl = getAvatarUrl(selectedConversation?.avatar_url)

  return (
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Conversations List */}
        <Card className="col-span-4 border-primary/20 bg-card/50 backdrop-blur-sm flex flex-col">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-4 pt-0">
              {conversations.map((conv) => {
                const avatarUrl = getAvatarUrl(conv.avatar_url)
                return (
                  <button
                    key={conv.user_id}
                    onClick={() => setSelectedUser(conv.user_id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedUser === conv.user_id
                        ? "bg-primary/20 border border-primary"
                        : "hover:bg-accent/10 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={conv.username} />}
                        <AvatarFallback>{conv.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold truncate">{conv.username}</p>
                          {conv.unread_count > 0 && (
                            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
              {conversations.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No conversations yet. Add friends to start chatting!
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Messages Area */}
        <Card className="col-span-8 border-primary/20 bg-card/50 backdrop-blur-sm flex flex-col">
          {selectedUser ? (
            <>
              <CardHeader className="border-b border-border">
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)} className="md:hidden">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar>
                    {selectedAvatarUrl && <AvatarImage src={selectedAvatarUrl} alt={selectedConversation?.username || ""} />}
                    <AvatarFallback>{selectedConversation?.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <CardTitle>{selectedConversation?.username}</CardTitle>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isCurrentUser = message.sender_id === currentUserId
                    return (
                      <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            isCurrentUser ? "bg-primary text-primary-foreground" : "bg-accent/50"
                          }`}
                        >
                          <p className="break-words">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                          >
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <CardContent className="border-t border-border p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start messaging
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
