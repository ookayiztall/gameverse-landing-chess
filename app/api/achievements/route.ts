import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
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

function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null
  return createSupabaseClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

async function ensureAchievementRows(admin: ReturnType<typeof createAdminClient>) {
  const titles = ACHIEVEMENTS.map((a) => a.title)
  const { data: existing } = await (admin || (await createClient()))
    .from("achievements")
    .select("id, title, description, badge_icon")
    .in("title", titles)

  const existingByTitle = new Map<string, { id: string; title: string; description: string | null; badge_icon: string | null }>(
    (existing || []).map((row: any) => [row.title, row]),
  )

  const missing = ACHIEVEMENTS.filter((a) => !existingByTitle.has(a.title))
  if (missing.length > 0 && admin) {
    await admin.from("achievements").insert(missing)
  }

  const { data: all } = await (admin || (await createClient()))
    .from("achievements")
    .select("id, title, description, badge_icon")
    .in("title", titles)

  return (all || []) as { id: string; title: string; description: string | null; badge_icon: string | null }[]
}

async function evaluateAndUpsertUserAchievements(
  userId: string,
  stats: { points: number; total_wins: number; total_losses: number; win_streak: number },
  achievements: { id: string; title: string; description: string | null; badge_icon: string | null }[],
  admin: ReturnType<typeof createAdminClient>,
) {
  const { data: top10Rows } = await (admin || (await createClient()))
    .from("user_stats")
    .select("user_id")
    .order("points", { ascending: false })
    .limit(10)

  const top10Set = new Set<string>((top10Rows || []).map((r: any) => r.user_id).filter(Boolean))

  const shouldUnlock = new Set<string>()
  if (stats.total_wins >= 1) shouldUnlock.add("First Win")
  if (stats.win_streak >= 10) shouldUnlock.add("Hot Streak")
  if (top10Set.has(userId)) shouldUnlock.add("Top 10")
  if (stats.total_wins >= 100) shouldUnlock.add("Star Player")

  const byTitle = new Map(achievements.map((a) => [a.title, a]))
  const toUpsert = Array.from(shouldUnlock)
    .map((title) => byTitle.get(title))
    .filter(Boolean)
    .map((a) => ({ user_id: userId, achievement_id: (a as any).id, unlocked_at: new Date().toISOString() }))

  if (toUpsert.length > 0) {
    await (admin || (await createClient()))
      .from("user_achievements")
      .upsert(toUpsert as any[], { onConflict: "user_id,achievement_id", ignoreDuplicates: true })
  }
}

async function listForCurrentUser() {
  const session = await createClient()
  const {
    data: { user },
  } = await session.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const achievementRows = await ensureAchievementRows(admin)

  const { data: stats } = await session
    .from("user_stats")
    .select("points, total_wins, total_losses, win_streak")
    .eq("user_id", user.id)
    .maybeSingle()

  const normalized = {
    points: Number((stats as any)?.points ?? 0) || 0,
    total_wins: Number((stats as any)?.total_wins ?? 0) || 0,
    total_losses: Number((stats as any)?.total_losses ?? 0) || 0,
    win_streak: Number((stats as any)?.win_streak ?? 0) || 0,
  }

  await evaluateAndUpsertUserAchievements(user.id, normalized, achievementRows, admin)

  const { data: unlockedRows } = await (admin || session)
    .from("user_achievements")
    .select("achievement_id, unlocked_at")
    .eq("user_id", user.id)

  const unlockedById = new Map<string, string>((unlockedRows || []).map((r: any) => [r.achievement_id, r.unlocked_at]))

  const desiredOrder = new Map<string, number>(ACHIEVEMENTS.map((a, idx) => [a.title, idx]))

  const payload = achievementRows
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      badge_icon: a.badge_icon,
      unlocked: unlockedById.has(a.id),
      unlocked_at: unlockedById.get(a.id) || null,
    }))
    .sort((a, b) => {
      const aKey = desiredOrder.get(a.title) ?? 999
      const bKey = desiredOrder.get(b.title) ?? 999
      if (aKey !== bKey) return aKey - bKey
      return a.title.localeCompare(b.title)
    })

  return NextResponse.json(payload)
}

export async function GET() {
  try {
    return await listForCurrentUser()
  } catch (error) {
    console.error("Error fetching achievements:", error)
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
  }
}

export async function POST() {
  try {
    return await listForCurrentUser()
  } catch (error) {
    console.error("Error evaluating achievements:", error)
    return NextResponse.json({ error: "Failed to evaluate achievements" }, { status: 500 })
  }
}
