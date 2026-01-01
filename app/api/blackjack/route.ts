import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import path from "path"
import { readFile } from "fs/promises"

export const runtime = "nodejs"

type BlackjackOutcome = "win" | "loss" | "tie"

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

async function ensureAchievementRows(
  session: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
) {
  const titles = ACHIEVEMENTS.map((a) => a.title)
  const { data: existing } = await (admin || session).from("achievements").select("id, title").in("title", titles)
  const existingTitles = new Set<string>((existing || []).map((r: any) => r.title).filter(Boolean))
  const missing = ACHIEVEMENTS.filter((a) => !existingTitles.has(a.title))
  if (missing.length > 0 && admin) {
    await admin.from("achievements").insert(missing)
  }
  const { data: all } = await (admin || session).from("achievements").select("id, title").in("title", titles)
  return (all || []) as { id: string; title: string }[]
}

async function maybeUnlockAchievements(
  session: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  stats: { points: number; total_wins: number; total_losses: number; win_streak: number },
) {
  const admin = createAdminClient()
  const rows = await ensureAchievementRows(session, admin)

  const { data: top10Rows } = await (admin || session)
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

  const byTitle = new Map<string, { id: string; title: string }>(rows.map((r) => [r.title, r]))
  const toUpsert = Array.from(shouldUnlock)
    .map((title) => byTitle.get(title))
    .filter(Boolean)
    .map((a) => ({ user_id: userId, achievement_id: (a as any).id, unlocked_at: new Date().toISOString() }))

  if (toUpsert.length > 0) {
    await (admin || session)
      .from("user_achievements")
      .upsert(toUpsert as any[], { onConflict: "user_id,achievement_id", ignoreDuplicates: true })
  }
}

function computePointsDelta(outcome: BlackjackOutcome, reason?: string) {
  if (outcome === "loss") return 0
  if (outcome === "tie") return 2
  if (reason === "blackjack") return 15
  return 10
}

async function buildSrcDoc() {
  const baseDir = path.join(process.cwd(), "vendor", "Simple Black Jack")
  const [html, gameIframeCss, js, cardPng] = await Promise.all([
    readFile(path.join(baseDir, "index.html"), "utf8"),
    readFile(path.join(process.cwd(), "game-iframe.css"), "utf8"),
    readFile(path.join(baseDir, "script.js"), "utf8"),
    readFile(path.join(baseDir, "card.png")),
  ])

  const cardPngDataUrl = "data:image/png;base64," + Buffer.from(cardPng).toString("base64")

  const themedCss =
    gameIframeCss +
    "\n" +
    [
      "body {",
      "  background: radial-gradient(1200px 600px at 20% 10%, rgba(88,86,214,0.22), transparent 55%),",
      "              radial-gradient(1000px 520px at 85% 15%, rgba(167,107,207,0.18), transparent 60%),",
      "              radial-gradient(1000px 520px at 50% 85%, rgba(34,197,94,0.12), transparent 60%),",
      "              #070a12;",
      "}",
      "#game-toolbar button {",
      "  padding: 8px 10px;",
      "  font-size: 13px;",
      "  border-radius: 12px;",
      "  line-height: 1;",
      "}",
      ".gv-hand {",
      "  display: flex;",
      "  gap: 10px;",
      "  padding: 10px;",
      "  border-radius: 16px;",
      "  border: 1px solid rgba(255,255,255,0.10);",
      "  background: rgba(0,0,0,0.14);",
      "  box-shadow: 0 18px 60px rgba(0,0,0,0.35);",
      "  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;",
      "}",
      ".gv-hand[data-active=\"true\"] {",
      "  border-color: rgba(34,197,94,0.55);",
      "  box-shadow: 0 0 0 2px rgba(34,197,94,0.22) inset, 0 18px 60px rgba(0,0,0,0.35);",
      "  transform: translateY(-1px);",
      "}",
      "@keyframes gvPulseWin {",
      "  0% { box-shadow: 0 20px 80px rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.14); }",
      "  40% { box-shadow: 0 22px 90px rgba(34,197,94,0.22); border-color: rgba(34,197,94,0.55); }",
      "  100% { box-shadow: 0 20px 80px rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.14); }",
      "}",
      "@keyframes gvPulseLoss {",
      "  0% { box-shadow: 0 20px 80px rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.14); }",
      "  40% { box-shadow: 0 22px 90px rgba(239,68,68,0.20); border-color: rgba(239,68,68,0.55); }",
      "  100% { box-shadow: 0 20px 80px rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.14); }",
      "}",
      "@keyframes gvPulseTie {",
      "  0% { box-shadow: 0 20px 80px rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.14); }",
      "  40% { box-shadow: 0 22px 90px rgba(96,165,250,0.20); border-color: rgba(96,165,250,0.55); }",
      "  100% { box-shadow: 0 20px 80px rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.14); }",
      "}",
      "#game-area.gv-win { animation: gvPulseWin 620ms ease-out; }",
      "#game-area.gv-loss { animation: gvPulseLoss 620ms ease-out; }",
      "#game-area.gv-tie { animation: gvPulseTie 620ms ease-out; }",
    ].join("\n")

  const injected = [
    ";(() => {",
    "  const post = (payload) => {",
    "    try {",
    '      window.parent.postMessage({ source: "gameverse_blackjack", ...payload }, "*")',
    "    } catch {}",
    "  }",
    "",
    "  let reported = false",
    "",
    "  setInterval(() => {",
    "    try {",
    "      if (!roundWon && !roundLost && !roundTied) {",
    "        reported = false",
    "        return",
    "      }",
    "      if (reported) return",
    "",
    '      const outcome = roundWon ? "win" : roundLost ? "loss" : "tie"',
    '      const announcement = announcementNode && announcementNode.textContent ? String(announcementNode.textContent) : ""',
    '      const reason = announcement.toLowerCase().includes("blackjack") ? "blackjack" : undefined',
    "",
    '      post({ type: "round_end", outcome, reason, announcement })',
    "      reported = true",
    "    } catch {}",
    "  }, 300)",
    "})()",
    "",
  ].join("\n")

  const patchedJs = js.replaceAll("./card.png", cardPngDataUrl) + "\n" + injected

  let out = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, "")
  out = out.replace(
    /<h2>\s*Dealer\s*\(/i,
    '<h2><span class="gv-title gv-title-house">House</span> (',
  )
  out = out.replace(
    /<h2>\s*Player\s*\(/i,
    '<h2><span class="gv-title gv-title-you">You</span> (',
  )
  out = out.replace(/<link[^>]*href="styles\.css"[^>]*>/i, "<style>" + themedCss + "</style>")
  out = out.replace(/<script[^>]*src="script\.js"[^>]*><\/script>/i, "<script>" + patchedJs + "</script>")

  return out
}

export async function GET() {
  try {
    const srcDoc = await buildSrcDoc()
    return new NextResponse(srcDoc, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    })
  } catch (error) {
    console.error("Failed to serve blackjack srcDoc:", error)
    return NextResponse.json({ error: "Failed to load game" }, { status: 500 })
  }
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

    let outcome: BlackjackOutcome | null = null
    let reason: string | undefined
    try {
      const body = (await request.json()) as any
      outcome = body?.outcome ?? null
      reason = typeof body?.reason === "string" ? body.reason : undefined
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    if (outcome !== "win" && outcome !== "loss" && outcome !== "tie") {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 })
    }

    const pointsDelta = computePointsDelta(outcome, reason)

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
        description: `Played Black Jack (${outcome})`,
        metadata: {
          game: "Black Jack",
          outcome,
          score: pointsDelta,
          pointsDelta,
          totalPoints: next.points,
          reason: reason || null,
        },
      })
    } catch (activityError) {
      console.error("Failed to insert blackjack activity:", activityError)
    }

    try {
      await maybeUnlockAchievements(supabase, user.id, {
        points: next.points,
        total_wins: next.total_wins,
        total_losses: next.total_losses,
        win_streak: next.win_streak,
      })
    } catch (unlockError) {
      console.error("Failed to unlock achievements:", unlockError)
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
    console.error("Failed to record blackjack result:", error)
    return NextResponse.json({ error: "Failed to record result" }, { status: 500 })
  }
}
