"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Heart, Laugh, Frown, ThumbsUp, Star, Flame } from "lucide-react"

interface ReactionButtonProps {
  targetType: "message" | "blog_post" | "comment" | "activity"
  targetId: string
  currentUserId: string
}

const reactionIcons = {
  like: ThumbsUp,
  love: Heart,
  laugh: Laugh,
  wow: Star,
  sad: Frown,
  angry: Flame,
}

const reactionColors = {
  like: "text-blue-500",
  love: "text-red-500",
  laugh: "text-yellow-500",
  wow: "text-purple-500",
  sad: "text-gray-500",
  angry: "text-orange-500",
}

export function ReactionButton({ targetType, targetId, currentUserId }: ReactionButtonProps) {
  const [reactions, setReactions] = useState<any[]>([])
  const [userReaction, setUserReaction] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchReactions()
  }, [targetId])

  async function fetchReactions() {
    const { data } = await supabase
      .from("reactions")
      .select("*")
      .eq("target_type", targetType)
      .eq("target_id", targetId)

    if (data) {
      setReactions(data)
      const myReaction = data.find((r) => r.user_id === currentUserId)
      setUserReaction(myReaction?.reaction_type || null)
    }
  }

  async function toggleReaction(reactionType: string) {
    if (!currentUserId) return

    if (userReaction === reactionType) {
      // Remove reaction
      await supabase
        .from("reactions")
        .delete()
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("user_id", currentUserId)
    } else {
      // Add or update reaction
      await supabase.from("reactions").upsert({
        user_id: currentUserId,
        target_type: targetType,
        target_id: targetId,
        reaction_type: reactionType,
      })
    }

    fetchReactions()
    setOpen(false)
  }

  const reactionCounts = reactions.reduce(
    (acc, r) => {
      acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8">
            {userReaction ? (
              <>
                {(() => {
                  const Icon = reactionIcons[userReaction as keyof typeof reactionIcons]
                  const colorClass = reactionColors[userReaction as keyof typeof reactionColors]
                  return <Icon className={`h-4 w-4 ${colorClass}`} />
                })()}
              </>
            ) : (
              <Heart className="h-4 w-4" />
            )}
            <span className="ml-2 text-xs">{reactions.length > 0 ? reactions.length : "React"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {Object.entries(reactionIcons).map(([type, Icon]) => (
              <button
                key={type}
                onClick={() => toggleReaction(type)}
                className={`p-2 rounded hover:bg-accent transition-colors ${userReaction === type ? "bg-accent" : ""}`}
              >
                <Icon
                  className={`h-5 w-5 ${reactionColors[type as keyof typeof reactionColors]}`}
                  fill={userReaction === type ? "currentColor" : "none"}
                />
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {(Object.entries(reactionCounts) as Array<[string, number]>).map(([type, count]) => {
        const Icon = reactionIcons[type as keyof typeof reactionIcons]
        const colorClass = reactionColors[type as keyof typeof reactionColors]
        return (
          <div key={type} className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon className={`h-3 w-3 ${colorClass}`} />
            <span>{count}</span>
          </div>
        )
      })}
    </div>
  )
}
