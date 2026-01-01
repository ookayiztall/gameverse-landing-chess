import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Users } from "lucide-react"
import Link from "next/link"

export interface GameCardProps {
  id: string
  name: string
  category: string
  players: number
  difficulty: "Easy" | "Medium" | "Hard"
  thumbnail: string
  description: string
  isMultiplayer: boolean
  href?: string
}

export function GameCard({ name, category, players, difficulty, description, isMultiplayer, href }: GameCardProps) {
  const difficultyColors: Record<string, string> = {
    Easy: "bg-primary/20 text-primary",
    Medium: "bg-secondary/20 text-secondary",
    Hard: "bg-accent/20 text-accent",
  }

  return (
    <Card className="overflow-hidden bg-card/50 border-border/50 backdrop-blur hover:border-primary/30 transition-all group">
      {/* Game Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 group-hover:opacity-75 transition-opacity"></div>
        <div className="relative flex flex-col items-center justify-center gap-2">
          <div className="text-4xl">
            {category === "Card Games"
              ? "🃏"
              : category === "Casino"
                ? "🎲"
                : category === "Trivia"
                  ? "🧠"
                  : category === "Puzzle"
                    ? "🧩"
                    : "🎮"}
          </div>
          <p className="text-xs text-muted-foreground font-medium">{category}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">{name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{description}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{players} playing</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[difficulty]}`}>
            {difficulty}
          </span>
        </div>

        {/* Multiplayer Badge */}
        {isMultiplayer && (
          <div className="flex items-center gap-1 text-xs text-secondary">
            <span className="inline-block w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
            <span>Multiplayer</span>
          </div>
        )}

        {/* Action Button */}
        {href ? (
          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold gap-2">
            <Link href={href}>
              <Play className="w-4 h-4" />
              Play Now
            </Link>
          </Button>
        ) : (
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold gap-2">
            <Play className="w-4 h-4" />
            Play Now
          </Button>
        )}
      </div>
    </Card>
  )
}
