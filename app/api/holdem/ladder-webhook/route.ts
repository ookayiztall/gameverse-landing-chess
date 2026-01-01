import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

type AchievementDefinition = {
  title: string
  description: string
  badge_icon: string
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  { title: "First Win", description: "Win your first game", badge_icon: "🏆" },
  { title: "Hot Streak", description: "10-win streak", badge_icon: "🔥" },
  { title: "Top 10", description: "Rank in top 10", badge_icon: "🏅" },
  { title: "Star Player", description: "100 wins", badge_icon: "🌟" },
]

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function ensureAchievementRows(supabase: any) {
  const titles = ACHIEVEMENTS.map((a) => a.title)
  const { data: existing } = await supabase.from("achievements").select("id, title").in("title", titles)
  const existingTitles = new Set<string>((existing || []).map((r: any) => r.title).filter(Boolean))
  const missing = ACHIEVEMENTS.filter((a) => !existingTitles.has(a.title))
  if (missing.length > 0) {
    await supabase.from("achievements").insert(missing)
  }
  const { data: all } = await supabase.from("achievements").select("id, title").in("title", titles)
  return (all || []) as { id: string; title: string }[]
}

async function maybeUnlockAchievements(supabase: any, userId: string) {
  const rows = await ensureAchievementRows(supabase)

  const [{ data: stats }, { data: top10Rows }] = await Promise.all([
    supabase.from("user_stats").select("points, total_wins, total_losses, win_streak").eq("user_id", userId).maybeSingle(),
    supabase.from("user_stats").select("user_id").order("points", { ascending: false }).limit(10),
  ])

  const normalized = {
    points: Number((stats as any)?.points ?? 0) || 0,
    total_wins: Number((stats as any)?.total_wins ?? 0) || 0,
    total_losses: Number((stats as any)?.total_losses ?? 0) || 0,
    win_streak: Number((stats as any)?.win_streak ?? 0) || 0,
  }

  const top10Set = new Set<string>((top10Rows || []).map((r: any) => r.user_id).filter(Boolean))

  const shouldUnlock = new Set<string>()
  if (normalized.total_wins >= 1) shouldUnlock.add("First Win")
  if (normalized.win_streak >= 10) shouldUnlock.add("Hot Streak")
  if (top10Set.has(userId)) shouldUnlock.add("Top 10")
  if (normalized.total_wins >= 100) shouldUnlock.add("Star Player")

  const byTitle = new Map<string, { id: string; title: string }>(rows.map((r) => [r.title, r]))
  const toUpsert = Array.from(shouldUnlock)
    .map((title) => byTitle.get(title))
    .filter(Boolean)
    .map((a) => ({ user_id: userId, achievement_id: (a as any).id, unlocked_at: new Date().toISOString() }))

  if (toUpsert.length > 0) {
    await supabase
      .from("user_achievements")
      .upsert(toUpsert as any[], { onConflict: "user_id,achievement_id", ignoreDuplicates: true })
  }
}

export async function POST(request: Request) {
  const expectedSecret = process.env.HOLDEM_WEBHOOK_SECRET
  if (!expectedSecret) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 })
  }

  const providedSecret = request.headers.get("x-holdem-secret")
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 })
  }

  const contentType = request.headers.get("content-type") || ""

  let playerName: string | null = null
  let score: number | null = null

  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const bodyText = await request.text()
      const params = new URLSearchParams(bodyText)
      playerName = params.get("player_name")
      score = params.get("score") ? Number(params.get("score")) : null
    } else {
      const body = (await request.json()) as any
      playerName = body?.player_name ?? body?.playerName ?? null
      score = body?.score != null ? Number(body.score) : null
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  if (!playerName || score == null || !Number.isFinite(score)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const supabase = createSupabaseClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const profileQuery = looksLikeUuid(playerName)
    ? supabase.from("profiles").select("id").eq("id", playerName).maybeSingle()
    : supabase.from("profiles").select("id").eq("username", playerName).maybeSingle()

  const { data: profile, error: profileError } = await profileQuery
  if (profileError) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  }

  if (!profile?.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const points = Math.max(0, Math.trunc(score))
  const payload: Record<string, unknown> = { user_id: profile.id, points, updated_at: new Date().toISOString() }

  const { error: upsertError } = await supabase.from("user_stats").upsert(payload, { onConflict: "user_id" })
  if (upsertError) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }

  try {
    await maybeUnlockAchievements(supabase, profile.id)
  } catch (unlockError) {
    console.error("Failed to unlock achievements:", unlockError)
  }

  return NextResponse.json({ ok: true })
}
