import { Card } from "@/components/ui/card"
import { getAvatarUrl } from "@/lib/utils"

interface ChatMessageProps {
  username: string
  avatar: string
  message: string
  timestamp: string
  isCurrentUser: boolean
  status?: "online" | "away" | "offline"
}

export function ChatMessage({
  username,
  avatar,
  message,
  timestamp,
  isCurrentUser,
  status = "online",
}: ChatMessageProps) {
  const statusColors = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    offline: "bg-gray-500",
  }
  const avatarUrl = getAvatarUrl(avatar)

  return (
    <div className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold overflow-hidden">
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : avatar}
        </div>
        <div
          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${statusColors[status]}`}
        ></div>
      </div>

      {/* Message */}
      <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} max-w-xs`}>
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-semibold text-foreground">{username}</p>
          <p className="text-xs text-muted-foreground">{timestamp}</p>
        </div>
        <Card
          className={`mt-1 p-3 ${
            isCurrentUser
              ? "bg-primary text-primary-foreground border-primary/50"
              : "bg-card/50 border-border/50 text-foreground"
          } backdrop-blur`}
        >
          <p className="text-sm leading-relaxed">{message}</p>
        </Card>
      </div>
    </div>
  )
}
