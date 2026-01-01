import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MainNav } from "@/components/main-nav" // Use MainNav instead of AdminNav

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: initialProfile, error: initialProfileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (initialProfileError) {
    redirect("/dashboard")
  }

  let profile = initialProfile
  if (!profile) {
    await supabase.from("profiles").insert({ id: user.id, theme: "dark" })
    const { data: createdProfile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    profile = createdProfile
  }

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MainNav />
      <main className="flex-1">{children}</main>
    </div>
  )
}
