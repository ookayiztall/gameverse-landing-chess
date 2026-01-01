"use client"

import { Plus, Edit2, Trash2, X, Check } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { getAvatarUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatChannel {
  id: string
  name: string
  icon: string
  unread?: number
}

interface OnlineUser {
  name: string
  avatar: string
  status: "online" | "away"
}

interface VoiceChannelUser {
  userId: string
  username: string
  avatar: string
  isMuted: boolean
}

interface ChatSidebarProps {
  selectedChannel: string
  onSelectChannel: (channel: string) => void
  voiceChannelUsers?: VoiceChannelUser[] // Added prop for voice channel users
  currentUserId?: string // Added prop for current user ID
}

export function ChatSidebar({
  selectedChannel,
  onSelectChannel,
  voiceChannelUsers = [],
  currentUserId,
}: ChatSidebarProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newChannelName, setNewChannelName] = useState("")
  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        if (!error) {
          setIsAdmin(profile?.role === "admin")
        }
      }
    }

    checkAdmin()

    const loadChannels = async () => {
      const { data } = await supabase.from("chat_channels").select("*").order("created_at")

      if (data) {
        setChannels(
          data.map((ch) => ({
            id: ch.id,
            name: ch.name,
            icon: ch.icon || "💬",
          })),
        )
      }
    }

    loadChannels()

    setOnlineUsers([
      { name: "ShadowKnight", avatar: "🗡️", status: "online" },
      { name: "NeonGamer", avatar: "⚡", status: "online" },
      { name: "PhantomEcho", avatar: "👻", status: "away" },
    ])
  }, [])

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !isAdmin) return

    const { data, error } = await supabase
      .from("chat_channels")
      .insert({
        name: newChannelName.trim().toLowerCase(),
        icon: "💬",
      })
      .select()
      .single()

    if (data && !error) {
      setChannels([...channels, { id: data.id, name: data.name, icon: data.icon || "💬" }])
      setNewChannelName("")
      setIsCreating(false)
    }
  }

  const handleRenameChannel = async (channelId: string) => {
    if (!editingName.trim() || !isAdmin) return

    const { error } = await supabase
      .from("chat_channels")
      .update({ name: editingName.trim().toLowerCase() })
      .eq("id", channelId)

    if (!error) {
      setChannels(channels.map((ch) => (ch.id === channelId ? { ...ch, name: editingName.trim().toLowerCase() } : ch)))
      setEditingChannelId(null)
      setEditingName("")
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!isAdmin) return

    const confirmDelete = confirm("Are you sure you want to delete this channel? All messages will be lost.")
    if (!confirmDelete) return

    const { error } = await supabase.from("chat_channels").delete().eq("id", channelId)

    if (!error) {
      setChannels(channels.filter((ch) => ch.id !== channelId))
      if (selectedChannel === channels.find((ch) => ch.id === channelId)?.name) {
        onSelectChannel(channels[0]?.name || "General")
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Channels Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Channels</h2>
          {isAdmin && (
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          )}
        </div>

        {isCreating && isAdmin && (
          <div className="flex gap-2 px-2">
            <Input
              placeholder="channel-name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreateChannel()}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={handleCreateChannel} className="h-8 px-2">
              <Check className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="space-y-1">
          {channels.map((channel) => (
            <div key={channel.id}>
              {editingChannelId === channel.id ? (
                <div className="flex gap-2 px-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleRenameChannel(channel.id)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => handleRenameChannel(channel.id)} className="h-8 px-2">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingChannelId(null)
                      setEditingName("")
                    }}
                    className="h-8 px-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all group ${
                      selectedChannel === channel.name
                        ? "bg-primary/20 border border-primary/30 text-foreground"
                        : "hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => onSelectChannel(channel.name)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span>{channel.icon}</span>
                      <span className="text-sm font-medium">{channel.name}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingChannelId(channel.id)
                            setEditingName(channel.name)
                          }}
                          className="p-1 hover:bg-primary/20 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteChannel(channel.id)
                          }}
                          className="p-1 hover:bg-destructive/20 rounded text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {channel.unread && channel.unread > 0 && (
                      <span className="text-xs font-bold bg-accent text-accent-foreground px-2 py-1 rounded-full">
                        {channel.unread}
                      </span>
                    )}
                  </div>

                  {selectedChannel === channel.name && voiceChannelUsers.length > 0 && (
                    <div className="ml-6 mt-2 space-y-1 pb-2 border-l-2 border-primary/30 pl-3">
                      {voiceChannelUsers.map((voiceUser) => (
                        <div key={voiceUser.userId} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="relative">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs">
                              {getAvatarUrl(voiceUser.avatar) ? (
                                <img
                                  src={getAvatarUrl(voiceUser.avatar) as string}
                                  alt=""
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                voiceUser.avatar
                              )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background bg-green-500"></div>
                          </div>
                          <span className="flex-1 truncate">{voiceUser.username}</span>
                          {voiceUser.isMuted && <span className="text-red-500 text-[10px]">🔇</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Online Users */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">Online</h2>

        <div className="space-y-2">
          {onlineUsers.map((user) => (
            <div
              key={user.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary/10 cursor-pointer transition-all"
            >
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs">
                  {user.avatar}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-background ${
                    user.status === "online" ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
              </div>
              <span className="text-sm text-foreground flex-1 truncate">{user.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
