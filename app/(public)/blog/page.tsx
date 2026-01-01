"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  published_at: string
  author_id: string
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch("/api/blog", { cache: "no-store" })
        if (!response.ok) throw new Error("Failed to fetch posts")
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error("Unexpected response")
        setPosts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">GameVerse Blog</h1>
          <p className="text-lg text-muted-foreground">Latest news, tips, and updates from our gaming platform</p>
        </div>

        {/* Loading State */}
        {loading && <div className="text-center text-muted-foreground">Loading posts...</div>}

        {/* Error State */}
        {error && <div className="text-center text-destructive">Error: {error}</div>}

        {/* Blog Posts Grid */}
        {!loading && posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="bg-card/50 border-primary/30 hover:border-primary/60 cursor-pointer transition-all hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="line-clamp-2 text-lg">{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Read More →</span>
                      <span>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}
