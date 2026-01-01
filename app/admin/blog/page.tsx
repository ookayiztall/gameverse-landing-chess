"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Trash2, Eye, Edit2 } from "lucide-react"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  author_id: string
  published: boolean
  published_at: string | null
  created_at: string
}

export default function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setError(null)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setCurrentUserId(user?.id ?? null)

        const { data, error: dbError } = await supabase
          .from("blog_posts")
          .select("id, title, slug, excerpt, author_id, published, published_at, created_at")
          .order("created_at", { ascending: false })

        if (dbError) throw dbError
        setPosts((data || []) as BlogPost[])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts")
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [supabase])

  const deletePost = async (postId: string) => {
    setDeletingId(postId)
    try {
      setError(null)
      const res = await fetch(`/api/blog/${postId}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to delete post")
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Blog Posts</h1>
          <p className="text-muted-foreground mt-2">Manage your gaming platform blog</p>
        </div>
        <Link href="/admin/blog/new">
          <Button className="bg-primary hover:bg-primary/90">Create New Post</Button>
        </Link>
      </div>

      {/* Blog Posts Table */}
      <Card className="bg-card/50 border-primary/30 overflow-hidden">
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-muted-foreground">Loading posts...</div>}
          {error && <div className="text-sm text-destructive">Error: {error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Published Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-border hover:bg-primary/5">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-foreground">{post.title}</p>
                        <p className="text-sm text-muted-foreground">{post.slug}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          post.published ? "bg-green-500/20 text-green-600" : "bg-yellow-500/20 text-yellow-600"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {currentUserId && post.author_id === currentUserId && (
                          <Link href={`/admin/blog/${post.id}/edit`}>
                            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                        <Link href={`/blog/${post.slug}`} target="_blank">
                          <Button variant="ghost" size="sm" className="text-accent hover:bg-accent/10">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {currentUserId && post.author_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deletePost(post.id)}
                            disabled={deletingId === post.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
