import { Card } from "@/components/ui/card"
import { Flame } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  username: string
  avatar: string
  points: number
  wins: number
  streak: number
  isCurrentUser?: boolean
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  timeframe: "Weekly" | "Monthly" | "All Time"
}

export function LeaderboardTable({ entries, timeframe }: LeaderboardTableProps) {
  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400"
    if (rank === 2) return "text-gray-400"
    if (rank === 3) return "text-orange-400"
    return "text-muted-foreground"
  }

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return null
  }

  return (
    <Card className="overflow-hidden bg-card/50 border-border/50 backdrop-blur">
      {/* Table Header */}
      <div className="grid grid-cols-5 gap-4 p-4 border-b border-border/50 bg-muted/20 font-semibold text-sm text-muted-foreground">
        <div>Rank</div>
        <div className="col-span-2">Player</div>
        <div className="text-right">Points</div>
        <div className="text-right">Streak</div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border/30">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className={`grid grid-cols-5 gap-4 p-4 items-center transition-all hover:bg-primary/5 ${
              entry.isCurrentUser ? "bg-primary/10 border-l-2 border-primary" : ""
            }`}
          >
            {/* Rank */}
            <div className="flex items-center gap-2">
              {getMedalEmoji(entry.rank) ? (
                <span className="text-xl">{getMedalEmoji(entry.rank)}</span>
              ) : (
                <span className={`font-bold ${getMedalColor(entry.rank)}`}>#{entry.rank}</span>
              )}
            </div>

            {/* Player Info */}
            <div className="col-span-2 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold flex-shrink-0"
                title={entry.username}
              >
                {entry.avatar}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate text-foreground">{entry.username}</p>
                <p className="text-xs text-muted-foreground">{entry.wins} wins</p>
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <p className="font-bold text-primary">{entry.points.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>

            {/* Streak */}
            <div className="text-right flex items-center justify-end gap-2">
              <Flame className="w-4 h-4 text-accent" />
              <span className="font-semibold text-accent">{entry.streak}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
