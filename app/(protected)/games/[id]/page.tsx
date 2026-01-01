"use client"

import { useMemo, useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star, Send, Trash, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { getAvatarUrl } from "@/lib/utils"

interface Review {
  id: string
  user_id: string
  rating: number
  title: string
  content: string
  created_at: string
  profile: {
    username: string
    avatar_url?: string | null
  }
}

export default function GameDetailPage({ params }: { params: { id: string } }) {
  const [game, setGame] = useState<any>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [rating, setRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState("")
  const [reviewContent, setReviewContent] = useState("")
  const [currentUserId, setCurrentUserId] = useState("")
  const [showReviewForm, setShowReviewForm] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    fetchGame()
    fetchReviews()
    fetchCurrentUser()
  }, [params.id])

  useEffect(() => {
    if (!currentUserId) return
    setUserReview(reviews.find((r) => r.user_id === currentUserId) || null)
  }, [reviews, currentUserId])

  async function fetchCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  async function fetchGame() {
    const { data } = await supabase.from("games").select("*").eq("id", params.id).single()

    setGame(data)
  }

  async function fetchReviews() {
    const { data } = await supabase.from("game_reviews").select("*").eq("game_id", params.id).order("created_at", { ascending: false })

    const userIds = Array.from(new Set((data || []).map((r) => r.user_id).filter(Boolean)))
    const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
    const profilesById = new Map<string, { username: string; avatar_url?: string | null }>(
      (profiles || []).map((p) => [p.id, { username: p.username || "Unknown", avatar_url: p.avatar_url || null }]),
    )

    setReviews(
      (data || []).map((r: any) => ({
        ...r,
        profile: profilesById.get(r.user_id) || { username: "Unknown", avatar_url: null },
      })),
    )
  }

  async function submitReview() {
    if (!reviewContent.trim() || !currentUserId) return

    const { error } = await supabase.from("game_reviews").insert({
      game_id: params.id,
      user_id: currentUserId,
      rating,
      title: reviewTitle.trim() || "Review",
      content: reviewContent.trim(),
    })

    if (!error) {
      setReviewTitle("")
      setReviewContent("")
      setShowReviewForm(false)
      fetchReviews()
    }
  }

  async function deleteReview(reviewId: string) {
    await supabase.from("game_reviews").delete().eq("id", reviewId)
    fetchReviews()
  }

  const averageRating =
    reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0

  if (!game) return <div className="text-center py-12">Loading...</div>

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Games
      </Button>

      <div className="grid gap-6">
        {/* Game Info */}
        <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{game.title}</CardTitle>
                <p className="text-muted-foreground">{game.description}</p>
              </div>
              <div className="text-5xl">🎮</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{game.category}</Badge>
              <Badge variant="outline">{game.difficulty}</Badge>
              {game.is_multiplayer && <Badge variant="outline">Multiplayer</Badge>}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${Number(averageRating) >= star ? "fill-yellow-500 text-yellow-500" : "text-gray-400"}`}
                  />
                ))}
              </div>
              <span className="font-semibold">{averageRating}</span>
              <span className="text-muted-foreground">({reviews.length} reviews)</span>
            </div>

            {!userReview && currentUserId && (
              <Button onClick={() => setShowReviewForm(!showReviewForm)}>Write a Review</Button>
            )}
          </CardContent>
        </Card>

        {/* Review Form */}
        {showReviewForm && !userReview && (
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle>Write Your Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                      <Star
                        className={`h-8 w-8 ${rating >= star ? "fill-yellow-500 text-yellow-500" : "text-gray-400"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Title (optional)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Sum up your review..."
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Review</label>
                <Textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder="Share your experience with this game..."
                  rows={5}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={submitReview}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Review
                </Button>
                <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Reviews ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.map((review) => {
              const avatarUrl = getAvatarUrl(review.profile.avatar_url)
              return (
              <div key={review.id} className="p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={review.profile.username} />}
                      <AvatarFallback>{review.profile.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{review.profile.username}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${review.rating >= star ? "fill-yellow-500 text-yellow-500" : "text-gray-400"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.user_id === currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReview(review.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {review.title && <p className="font-semibold mb-2">{review.title}</p>}
                <p className="text-sm text-muted-foreground">{review.content}</p>
              </div>
              )
            })}

            {reviews.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No reviews yet. Be the first to review this game!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
