"use client"

import type React from "react"

import { useMemo, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChatMessage } from "@/components/chat-message"
import { ChatSidebar } from "@/components/chat-sidebar"
import { Send, Smile, Mic, MicOff, Phone, PhoneOff } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { getAvatarUrl } from "@/lib/utils"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface Message {
  id: string
  user_id: string
  message: string
  created_at: string
  profiles?: {
    username: string
    avatar_url?: string
  }
}

interface VoiceUser {
  userId: string
  username: string
  peerId: string
  stream?: MediaStream
}

interface VoiceChannelUser {
  userId: string
  username: string
  avatar: string
  isMuted: boolean
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedChannel, setSelectedChannel] = useState("General")
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([])
  const [voiceChannelUsers, setVoiceChannelUsers] = useState<VoiceChannelUser[]>([]) // Track users in voice channel
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const messageChannelRef = useRef<RealtimeChannel | null>(null)
  const voiceChannelRef = useRef<RealtimeChannel | null>(null)
  const profileCacheRef = useRef<Map<string, { username: string; avatar_url?: string }>>(new Map())
  const supabase = useMemo(() => createBrowserClient(), [])

  const getChannel = async (channelName: string) => {
    const { data, error } = await supabase
      .from("chat_channels")
      .select("id, name")
      .ilike("name", channelName)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) return null
    return data
  }

  const getProfilesById = async (userIds: string[]) => {
    const uniqueIds = Array.from(new Set(userIds)).filter(Boolean)
    const missing = uniqueIds.filter((id) => !profileCacheRef.current.has(id))
    if (missing.length === 0) return

    const { data } = await supabase.from("profiles").select("id, username, avatar_url").in("id", missing)
    for (const p of data || []) {
      if (!p?.id) continue
      profileCacheRef.current.set(p.id, { username: p.username, avatar_url: p.avatar_url || undefined })
    }
  }

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    fetchUser()
  }, [])

  // Load messages and subscribe to real-time updates
  useEffect(() => {
    if (!currentUser) return

    let isActive = true
    let pollInterval: number | null = null

    const setup = async () => {
      const channelData = await getChannel(selectedChannel)
      if (!isActive) return

      if (!channelData) {
        setMessages([])
        return
      }

      const fetchLatest = async () => {
        const { data } = await supabase
          .from("chat_messages")
          .select("id, user_id, message, created_at")
          .eq("channel_id", channelData.id)
          .order("created_at", { ascending: true })
          .limit(50)

        if (!isActive) return

        const userIds = (data || []).map((m) => m.user_id)
        await getProfilesById(userIds)

        if (!isActive) return

        const normalizedMessages = (data || []).map((msg) => ({
          ...msg,
          profiles: profileCacheRef.current.get(msg.user_id),
        })) as Message[]

        setMessages(normalizedMessages)
      }

      await fetchLatest()
      if (!isActive) return

      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current)
        messageChannelRef.current = null
      }
      if (!isActive) return

      const messageChannel = supabase
        .channel(`chat:${channelData.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `channel_id=eq.${channelData.id}`,
          },
          async (payload) => {
            if (!isActive) return
            const newMessage = payload.new as Message
            await getProfilesById([newMessage.user_id])
            if (!isActive) return
            const profiles = profileCacheRef.current.get(newMessage.user_id)
            setMessages((prev) =>
              prev.some((m) => m.id === newMessage.id) ? prev : [...prev, { ...newMessage, profiles }],
            )
          },
        )
        .subscribe((status) => {
          if (!isActive) return
          if (status === "SUBSCRIBED") {
            if (pollInterval) {
              window.clearInterval(pollInterval)
              pollInterval = null
            }
            return
          }
          if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
            if (pollInterval) return
            pollInterval = window.setInterval(() => {
              fetchLatest()
            }, 2000)
          }
        })

      messageChannelRef.current = messageChannel
    }

    setup()

    return () => {
      isActive = false
      if (pollInterval) {
        window.clearInterval(pollInterval)
      }
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current)
        messageChannelRef.current = null
      }
    }
  }, [currentUser, selectedChannel])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isVoiceChatActive) {
      stopVoiceChat()
    }
  }, [selectedChannel])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentUser) return

    const channelData = await getChannel(selectedChannel)

    if (channelData) {
      const { data: inserted, error } = await supabase
        .from("chat_messages")
        .insert({
          channel_id: channelData.id,
          user_id: currentUser.id,
          message: inputValue.trim(),
        })
        .select("id, user_id, message, created_at")
        .single()

      if (!error && inserted) {
        await getProfilesById([inserted.user_id])
        const profiles = profileCacheRef.current.get(inserted.user_id)
        setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, { ...inserted, profiles }]))
      }

      setInputValue("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startVoiceChat = async () => {
    try {
      console.log("[v0] Starting voice chat for channel:", selectedChannel)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      setIsVoiceChatActive(true)

      // Join voice channel in Supabase - channel specific
      const channelData = await getChannel(selectedChannel)

      console.log("[v0] Channel data:", channelData)

      if (channelData && currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", currentUser.id)
          .single()

        console.log("[v0] User profile:", profile)

        await supabase.from("voice_sessions").insert({
          channel_id: channelData.id,
          user_id: currentUser.id,
          peer_id: currentUser.id,
        })

        // Subscribe to voice presence for this specific channel
        const voiceChannel = supabase.channel(`voice:${selectedChannel}`)

        voiceChannel
          .on("presence", { event: "sync" }, () => {
            const state = voiceChannel.presenceState()
            console.log("[v0] Presence state:", state)
            const users: VoiceChannelUser[] = Object.entries(state).map(([key, presences]: [string, any]) => {
              const presence = presences[0]
              return {
                userId: presence.user_id,
                username: presence.username || "User",
                avatar: presence.avatar || "👤",
                isMuted: presence.is_muted || false,
              }
            })
            setVoiceChannelUsers(users)
            console.log("[v0] Users in voice channel:", users.length, users)
          })
          .on("presence", { event: "join" }, ({ key, newPresences }) => {
            console.log("[v0] User joined voice:", key, newPresences)
          })
          .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
            console.log("[v0] User left voice:", key, leftPresences)
          })
          .subscribe(async (status) => {
            console.log("[v0] Subscription status:", status)
            if (status === "SUBSCRIBED") {
              const avatar = getAvatarUrl(profile?.avatar_url) || "👤"
              const trackPayload = {
                user_id: currentUser.id,
                username: profile?.username || "User",
                avatar,
                is_muted: false,
                online_at: new Date().toISOString(),
              }
              console.log("[v0] Tracking presence with:", trackPayload)
              await voiceChannel.track(trackPayload)
            }
          })

        voiceChannelRef.current = voiceChannel
      }
    } catch (error) {
      console.error("[v0] Error starting voice chat:", error)
      alert("Could not access microphone. Please check permissions.")
    }
  }

  const stopVoiceChat = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Untrack from presence
    if (voiceChannelRef.current) {
      await voiceChannelRef.current.untrack()
      supabase.removeChannel(voiceChannelRef.current)
      voiceChannelRef.current = null
    }

    // Clean up peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()

    setIsVoiceChatActive(false)
    setIsMuted(false)
    setVoiceUsers([])
    setVoiceChannelUsers([])

    // Update voice session to inactive
    if (currentUser) {
      await supabase
        .from("voice_sessions")
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq("user_id", currentUser.id)
        .eq("is_active", true)
    }
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      audioTrack.enabled = !audioTrack.enabled
      setIsMuted(!audioTrack.enabled)

      if (voiceChannelRef.current && currentUser) {
        voiceChannelRef.current.track({
          user_id: currentUser.id,
          is_muted: !audioTrack.enabled,
        })
      }
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-primary/5">
      <div className="h-full flex gap-0">
        {/* Sidebar */}
        <div className="hidden lg:block w-64 border-r border-border/50 bg-card/30 backdrop-blur p-4 overflow-y-auto">
          <ChatSidebar
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
            voiceChannelUsers={voiceChannelUsers}
            currentUserId={currentUser?.id}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border/50 bg-card/30 backdrop-blur px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground capitalize">{selectedChannel}</h1>
                <p className="text-sm text-muted-foreground">
                  {isVoiceChatActive
                    ? `You're in ${selectedChannel} voice chat`
                    : "Join the voice channel to chat with friends"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Voice Chat Controls */}
                <div className="flex items-center gap-2">
                  {isVoiceChatActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className={isMuted ? "text-red-500" : "text-green-500"}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                  )}
                  <Button
                    variant={isVoiceChatActive ? "destructive" : "default"}
                    size="sm"
                    onClick={isVoiceChatActive ? stopVoiceChat : startVoiceChat}
                    className="gap-2"
                  >
                    {isVoiceChatActive ? (
                      <>
                        <PhoneOff className="w-4 h-4" />
                        Leave Voice
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        Join Voice
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${isVoiceChatActive ? "bg-green-500 animate-pulse" : "bg-muted"}`}
                  ></span>
                  <span className="text-foreground">
                    {isVoiceChatActive ? `${voiceChannelUsers.length} in voice` : "Not in voice"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                username={msg.profiles?.username || "Unknown"}
                avatar={msg.profiles?.avatar_url || "👤"}
                message={msg.message}
                timestamp={new Date(msg.created_at).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                isCurrentUser={msg.user_id === currentUser?.id}
                status="online"
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border/50 bg-card/30 backdrop-blur p-6">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder={`Message #${selectedChannel}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />

              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent">
                <Smile className="w-5 h-5" />
              </Button>

              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground px-4"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
