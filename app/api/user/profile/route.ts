import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

    if (error) throw error

    if (!profile) {
      const { error: createError } = await supabase.from("profiles").insert({
        id: user.id,
        username: (user.user_metadata as any)?.username || null,
        first_name: (user.user_metadata as any)?.first_name || null,
        last_name: (user.user_metadata as any)?.last_name || null,
        theme: "dark",
      })
      if (createError) throw createError

      const { data: created, error: refetchError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      if (refetchError) throw refetchError

      return NextResponse.json(created)
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { username, first_name, last_name, bio, avatar_url, theme } = body

    const payload: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString() }
    if (username !== undefined) payload.username = username
    if (first_name !== undefined) payload.first_name = first_name
    if (last_name !== undefined) payload.last_name = last_name
    if (bio !== undefined) payload.bio = bio
    if (avatar_url !== undefined) payload.avatar_url = avatar_url
    if (theme !== undefined) payload.theme = theme

    const { data: profile, error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" }).select().single()

    if (error) throw error

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
