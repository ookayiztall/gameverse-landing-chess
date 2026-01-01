"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Bell, Lock, Palette, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    soundEnabled: true,
    privateMode: false,
    friendRequests: true,
  })

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem("user")
    router.push("/login") // Fixed route - removed /auth prefix
  }

  const settingSections = [
    {
      title: "Notifications",
      icon: Bell,
      settings: [
        {
          label: "Email Notifications",
          description: "Receive email updates about games and tournaments",
          key: "emailNotifications" as const,
        },
        {
          label: "Push Notifications",
          description: "Get push notifications for important events",
          key: "pushNotifications" as const,
        },
        {
          label: "Sound Effects",
          description: "Enable in-game sound effects",
          key: "soundEnabled" as const,
        },
      ],
    },
    {
      title: "Privacy & Safety",
      icon: Lock,
      settings: [
        {
          label: "Private Mode",
          description: "Hide your online status from other players",
          key: "privateMode" as const,
        },
        {
          label: "Friend Requests",
          description: "Allow players to send you friend requests",
          key: "friendRequests" as const,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold glow-text">Settings</h1>
          <p className="text-muted-foreground">Customize your GameVerse experience</p>
        </div>

        {/* Settings Sections */}
        {settingSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title} className="bg-card/50 border-border/50 backdrop-blur overflow-hidden">
              {/* Section Header */}
              <div className="border-b border-border/50 p-6 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold">{section.title}</h2>
                </div>
              </div>

              {/* Settings List */}
              <div className="divide-y divide-border/30">
                {section.settings.map((setting) => (
                  <div key={setting.key} className="p-6 flex items-center justify-between hover:bg-primary/5">
                    <div>
                      <h3 className="font-semibold text-foreground">{setting.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{setting.description}</p>
                    </div>
                    <Toggle
                      pressed={settings[setting.key]}
                      onPressedChange={() => handleToggle(setting.key)}
                      className="bg-muted hover:bg-muted/80 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    />
                  </div>
                ))}
              </div>
            </Card>
          )
        })}

        {/* Account Section */}
        <Card className="bg-card/50 border-border/50 backdrop-blur overflow-hidden">
          <div className="border-b border-border/50 p-6 bg-muted/20">
            <div className="flex items-center gap-3">
              <Palette className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold">Account</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="font-semibold text-foreground">Email</p>
              <p className="text-sm text-muted-foreground mt-1">phantom_echo@example.com</p>
            </div>

            <div className="pt-4 border-t border-border/30 space-y-3">
              <Button variant="outline" className="w-full border-border bg-transparent hover:bg-primary/10">
                Change Password
              </Button>
              <Button variant="outline" className="w-full border-border bg-transparent hover:bg-primary/10">
                Two-Factor Authentication
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-destructive/10 border-destructive/30 backdrop-blur overflow-hidden">
          <div className="border-b border-destructive/20 p-6 bg-destructive/5">
            <h2 className="text-xl font-bold text-destructive">Danger Zone</h2>
          </div>

          <div className="p-6 space-y-3">
            <Button
              onClick={handleLogout}
              className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent border"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
            <Button
              variant="outline"
              className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent"
            >
              Delete Account
            </Button>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            Save Changes
          </Button>
          <Button variant="outline" className="flex-1 border-border bg-transparent">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
