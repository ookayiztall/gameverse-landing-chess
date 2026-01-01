"use client"

import { useMemo, useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Send, Reply, Trash } from "lucide-react"
import { ReactionButton } from "@/components/reaction-button"
import { getAvatarUrl } from "@/lib/utils"

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  parent_comment_id: string | null
  profile: {
    username: string
    avatar_url?: string | null
  }
  replies?: Comment[]
}

export function BlogComments({ blogPostId }: { blogPostId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    fetchComments()
    fetchCurrentUser()
  }, [blogPostId])

  async function fetchCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  async function fetchComments() {
    const { data: topLevel } = await supabase
      .from("blog_comments")
      .select("*")
      .eq("blog_post_id", blogPostId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })

    const topLevelIds = (topLevel || []).map((c) => c.id)
    const { data: replies } =
      topLevelIds.length > 0
        ? await supabase
            .from("blog_comments")
            .select("*")
            .in("parent_comment_id", topLevelIds)
            .order("created_at", { ascending: true })
        : { data: [] as any[] }

    const userIds = Array.from(new Set([...(topLevel || []), ...(replies || [])].map((c) => c.user_id).filter(Boolean)))
    const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
    const profilesById = new Map<string, { username: string; avatar_url?: string | null }>(
      (profiles || []).map((p) => [p.id, { username: p.username || "Unknown", avatar_url: p.avatar_url || null }]),
    )

    const repliesByParentId = new Map<string, any[]>()
    for (const reply of replies || []) {
      if (!reply.parent_comment_id) continue
      const arr = repliesByParentId.get(reply.parent_comment_id) || []
      arr.push({
        ...reply,
        profile: profilesById.get(reply.user_id) || { username: "Unknown", avatar_url: null },
      })
      repliesByParentId.set(reply.parent_comment_id, arr)
    }

    setComments(
      (topLevel || []).map((comment: any) => ({
        ...comment,
        profile: profilesById.get(comment.user_id) || { username: "Unknown", avatar_url: null },
        replies: repliesByParentId.get(comment.id) || [],
      })),
    )
  }

  async function postComment() {
    if (!newComment.trim() || !currentUserId) return

    const { error } = await supabase.from("blog_comments").insert({
      blog_post_id: blogPostId,
      user_id: currentUserId,
      content: newComment.trim(),
    })

    if (!error) {
      setNewComment("")
      fetchComments()
    }
  }

  async function postReply(parentId: string) {
    if (!replyContent.trim() || !currentUserId) return

    const { error } = await supabase.from("blog_comments").insert({
      blog_post_id: blogPostId,
      user_id: currentUserId,
      content: replyContent.trim(),
      parent_comment_id: parentId,
    })

    if (!error) {
      setReplyContent("")
      setReplyingTo(null)
      fetchComments()
    }
  }

  async function deleteComment(commentId: string) {
    await supabase.from("blog_comments").delete().eq("id", commentId)
    fetchComments()
  }

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Comment */}
        {currentUserId && (
          <div className="space-y-2">
            <Textarea
              placeholder="Share your thoughts..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <Button onClick={postComment} size="sm">
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <div className="flex gap-3 p-4 rounded-lg border border-border bg-background/50">
                <Avatar>
                  {getAvatarUrl(comment.profile.avatar_url) && (
                    <AvatarImage src={getAvatarUrl(comment.profile.avatar_url) as string} alt={comment.profile.username} />
                  )}
                  <AvatarFallback>{comment.profile.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{comment.profile.username}</p>
                      <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</p>
                    </div>
                    {comment.user_id === currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteComment(comment.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <p className="text-sm">{comment.content}</p>

                  <div className="flex items-center gap-4">
                    <ReactionButton targetType="comment" targetId={comment.id} currentUserId={currentUserId} />
                    {currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                    )}
                  </div>

                  {/* Reply Form */}
                  {replyingTo === comment.id && (
                    <div className="space-y-2 mt-3">
                      <Textarea
                        placeholder="Write a reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => postReply(comment.id)} size="sm">
                          Post Reply
                        </Button>
                        <Button onClick={() => setReplyingTo(null)} size="sm" variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3 p-4 rounded-lg border border-border bg-background/30">
                      <Avatar className="h-8 w-8">
                        {getAvatarUrl(reply.profile.avatar_url) && (
                          <AvatarImage src={getAvatarUrl(reply.profile.avatar_url) as string} alt={reply.profile.username} />
                        )}
                        <AvatarFallback>{reply.profile.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm">{reply.profile.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(reply.created_at).toLocaleString()}
                            </p>
                          </div>
                          {reply.user_id === currentUserId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteComment(reply.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <p className="text-sm">{reply.content}</p>

                        <ReactionButton targetType="comment" targetId={reply.id} currentUserId={currentUserId} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {comments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
