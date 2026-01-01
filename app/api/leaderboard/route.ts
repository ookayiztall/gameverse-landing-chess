import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get("timeframe") || "all"

    const supabase = await createClient()

    let query = supabase.from("user_stats").select("*").order("points", { ascending: false }).limit(100)

    const now = new Date()
    if (timeframe === "weekly") {
      const since = new Date(now)
      since.setDate(now.getDate() - 7)
      query = query.gte("updated_at", since.toISOString())
    } else if (timeframe === "monthly") {
      const since = new Date(now)
      since.setMonth(now.getMonth() - 1)
      query = query.gte("updated_at", since.toISOString())
    }

    const { data: stats, error } = await query

    if (error) throw error

    const candidateIds = Array.from(
      new Set((stats || []).map((row: any) => row?.user_id || row?.id).filter(Boolean)),
    ) as string[]

    const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", candidateIds)
    const profilesById = new Map<string, { username: string; avatar_url?: string }>(
      (profiles || []).map((p: any) => [p.id, { username: p.username, avatar_url: p.avatar_url || undefined }]),
    )

    const enriched = (stats || []).map((row: any) => {
      const profileId = row?.user_id || row?.id
      const profile = profileId ? profilesById.get(profileId) : undefined
      return { ...row, profiles: profile }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
