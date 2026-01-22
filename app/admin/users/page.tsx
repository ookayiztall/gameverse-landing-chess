"use client"

import { useMemo, useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, UserX, UserCheck, Shield } from "lucide-react"
import { getAvatarUrl } from "@/lib/utils"

interface User {
  user_id: string
  username: string | null
  avatar_url?: string | null
  role: string
  created_at: string
  banned_until: string | null
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  async function fetchUsers() {
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false })

    if (roleFilter !== "all") {
      query = query.eq("role", roleFilter)
    }

    const { data } = await query

    setUsers(data || [])
  }

  async function updateUserRole(userId: string, newRole: string) {
    await supabase.from("profiles").update({ role: newRole }).eq("user_id", userId)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from("moderation_logs").insert({
        moderator_id: user.id,
        action: "role_change",
        target_type: "user",
        target_id: userId,
        details: { new_role: newRole },
      })
    }

    fetchUsers()
  }

  async function banUser(userId: string, days: number) {
    const bannedUntil = new Date()
    bannedUntil.setDate(bannedUntil.getDate() + days)

    await supabase.from("profiles").update({ banned_until: bannedUntil.toISOString() }).eq("user_id", userId)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from("moderation_actions").insert({
        user_id: userId,
        moderator_id: user.id,
        action_type: "ban",
        reason: "Admin action",
        duration_minutes: days * 24 * 60,
        expires_at: bannedUntil.toISOString(),
      })

      await supabase.from("moderation_logs").insert({
        moderator_id: user.id,
        action: "user_banned",
        target_type: "user",
        target_id: userId,
        details: { duration_days: days },
      })
    }

    fetchUsers()
  }

  async function unbanUser(userId: string) {
    await supabase.from("profiles").update({ banned_until: null }).eq("user_id", userId)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await supabase.from("moderation_actions").insert({
        user_id: userId,
        moderator_id: user.id,
        action_type: "unban",
        reason: "Admin action",
      })

      await supabase.from("moderation_logs").insert({
        moderator_id: user.id,
        action: "user_unbanned",
        target_type: "user",
        target_id: userId,
      })
    }

    fetchUsers()
  }

  const filteredUsers = users.filter((user) => user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

  const isUserBanned = (bannedUntil: string | null) => {
    if (!bannedUntil) return false
    return new Date(bannedUntil) > new Date()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-balance mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">User Management</span>
        </h1>
        <p className="text-muted-foreground">Manage users, roles, and permissions</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const banned = isUserBanned(user.banned_until)
          const displayName = user.username || "Unknown User"
          const initials = displayName[0]?.toUpperCase() || "?"
          const avatarUrl = getAvatarUrl(user.avatar_url)

          return (
            <Card key={user.user_id} className="border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{displayName}</p>
                        {user.role === "admin" && (
                          <Badge className="bg-yellow-500/10 text-yellow-500">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {banned && <Badge variant="destructive">Banned</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                      {banned && user.banned_until && (
                        <p className="text-xs text-destructive">
                          Banned until {new Date(user.banned_until).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user.role !== "admin" && (
                      <Select value={user.role} onValueChange={(role) => updateUserRole(user.user_id, role)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {banned ? (
                      <Button size="sm" variant="outline" onClick={() => unbanUser(user.user_id)}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Unban
                      </Button>
                    ) : (
                      <Select onValueChange={(days) => banUser(user.user_id, Number.parseInt(days))}>
                        <SelectTrigger
                          size="sm"
                          className={`${buttonVariants({ variant: "destructive", size: "sm" })} border-0 shadow-none py-0 [&>svg]:hidden`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <UserX className="h-4 w-4" />
                            Ban
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Day</SelectItem>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="365">Permanent</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredUsers.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">No users found</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
