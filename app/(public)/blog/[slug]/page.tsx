"use client"

import { use, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BlogComments } from "@/components/blog-comments"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  published_at: string
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, content, published_at")
        .eq("slug", slug)
        .eq("published", true)
        .single()

      if (error || !data) {
        setPost(null)
        setLoading(false)
        return
      }

      setPost(data as BlogPost)
      setLoading(false)
    }

    fetchPost()
  }, [slug, supabase])

  if (loading) return <div className="text-center py-12">Loading...</div>

  if (!post) return <div className="text-center py-12">Post not found</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <Link href="/blog" className="inline-flex items-center gap-2 text-primary hover:underline">
          <ChevronLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        <Card className="bg-card/50 border-primary/30">
          <CardHeader>
            <CardTitle className="text-3xl">{post.title}</CardTitle>
            <p className="text-muted-foreground mt-2">Published {new Date(post.published_at).toLocaleDateString()}</p>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-foreground">{post.content}</p>
            </div>
          </CardContent>
        </Card>

        <BlogComments blogPostId={post.id} />
      </div>
    </div>
  )
}
