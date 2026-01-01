"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText, Settings, Users, BarChart3, Shield } from "lucide-react"

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your gaming platform content and settings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Blog Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">Total published posts</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-500" />
              Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">Available games</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-500" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">✓</div>
            <p className="text-xs text-muted-foreground mt-1">System active</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-primary/30">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/blog/new">
              <Button className="w-full justify-start bg-primary hover:bg-primary/90">
                <FileText className="w-4 h-4 mr-2" />
                Create New Blog Post
              </Button>
            </Link>
            <Link href="/admin/blog">
              <Button className="w-full justify-start bg-accent hover:bg-accent/90">
                <span className="mr-2">📝</span>
                Manage Blog Posts
              </Button>
            </Link>
            <Link href="/admin/moderation">
              <Button className="w-full justify-start bg-secondary hover:bg-secondary/90">
                <Shield className="w-4 h-4 mr-2" />
                Moderation Queue
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button className="w-full justify-start bg-secondary hover:bg-secondary/90">
                <Users className="w-4 h-4 mr-2" />
                User Management
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/30">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">New user signup</span>
                <span className="text-xs text-muted-foreground">2 hours ago</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Blog post published</span>
                <span className="text-xs text-muted-foreground">5 hours ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Game added to platform</span>
                <span className="text-xs text-muted-foreground">1 day ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

