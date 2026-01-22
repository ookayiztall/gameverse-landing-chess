import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

type ChessOutcome = "win" | "loss" | "draw"

function computePointsDelta(outcome: ChessOutcome) {
  if (outcome === "loss") return 0
  if (outcome === "draw") return 5
  return 20
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let outcome: ChessOutcome | null = null
    let gameOverType: string | null = null
    let room: string | null = null
    try {
      const body = (await request.json()) as any
      outcome = body?.outcome ?? null
      gameOverType = typeof body?.gameOverType === "string" ? body.gameOverType : null
      room = typeof body?.room === "string" ? body.room : null
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    if (outcome !== "win" && outcome !== "loss" && outcome !== "draw") {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 })
    }

    const pointsDelta = computePointsDelta(outcome)

    const { data: existing, error: existingError } = await supabase
      .from("user_stats")
      .select("points, total_wins, total_losses, win_streak")
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingError) throw existingError

    const prevPoints = Number(existing?.points ?? 0) || 0
    const prevWins = Number(existing?.total_wins ?? 0) || 0
    const prevLosses = Number(existing?.total_losses ?? 0) || 0
    const prevStreak = Number(existing?.win_streak ?? 0) || 0

    const next = {
      user_id: user.id,
      points: prevPoints + pointsDelta,
      total_wins: prevWins + (outcome === "win" ? 1 : 0),
      total_losses: prevLosses + (outcome === "loss" ? 1 : 0),
      win_streak: outcome === "win" ? prevStreak + 1 : outcome === "loss" ? 0 : prevStreak,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase.from("user_stats").upsert(next, { onConflict: "user_id" })
    if (upsertError) throw upsertError

    try {
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "game_played",
        description: `Played 3D Chess (${outcome})`,
        metadata: {
          game: "3D Chess",
          outcome,
          gameOverType,
          pointsDelta,
          totalPoints: next.points,
          room,
        },
      })
    } catch (activityError) {
      console.error("Failed to insert chess activity:", activityError)
    }

    return NextResponse.json({
      ok: true,
      points: next.points,
      pointsDelta,
      total_wins: next.total_wins,
      total_losses: next.total_losses,
      win_streak: next.win_streak,
    })
  } catch (error) {
    console.error("Failed to record chess result:", error)
    return NextResponse.json({ error: "Failed to record result" }, { status: 500 })
  }
}

