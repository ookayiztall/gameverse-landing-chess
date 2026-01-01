"use client"

import type React from "react"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  published: boolean
}

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    published: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/blog/${id}`, { cache: "no-store" })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error || "Failed to load post")
        }
        const post = (await res.json()) as BlogPost
        setFormData({
          title: post.title || "",
          slug: post.slug || "",
          content: post.content || "",
          excerpt: post.excerpt || "",
          published: !!post.published,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load post")
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim() || !formData.slug.trim() || !formData.content.trim()) {
      setError("Title, slug, and content are required.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/blog/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          slug: formData.slug.trim(),
          content: formData.content.trim(),
          excerpt: formData.excerpt.trim() || null,
          published: formData.published,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to update post")
      }

      router.push("/admin/blog")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Link href="/admin/blog" className="inline-flex items-center gap-2 text-primary hover:underline">
        <ChevronLeft className="w-4 h-4" />
        Back to Blog Posts
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-foreground">Edit Blog Post</h1>
        <p className="text-muted-foreground mt-2">Update title, content, and publish status</p>
      </div>

      <Card className="bg-card/50 border-primary/30">
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading post...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="text-sm text-destructive">Error: {error}</div>}

              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium text-foreground">
                  Post Title
                </label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Enter post title"
                  value={formData.title}
                  onChange={handleChange}
                  className="bg-input border-border focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="slug" className="text-sm font-medium text-foreground">
                  Post Slug
                </label>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="post-slug-url"
                  value={formData.slug}
                  onChange={handleChange}
                  className="bg-input border-border focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="excerpt" className="text-sm font-medium text-foreground">
                  Excerpt
                </label>
                <textarea
                  id="excerpt"
                  name="excerpt"
                  placeholder="Brief summary of your post"
                  value={formData.excerpt}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="content" className="text-sm font-medium text-foreground">
                  Content
                </label>
                <textarea
                  id="content"
                  name="content"
                  placeholder="Write your post content here..."
                  value={formData.content}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={10}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  name="published"
                  checked={formData.published}
                  onChange={handleChange}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="published" className="text-sm font-medium text-foreground cursor-pointer">
                  Published
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={saving}>
                  Save Changes
                </Button>
                <Link href="/admin/blog">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
