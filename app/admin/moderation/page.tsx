"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle, XCircle, Eye } from "lucide-react"

interface Report {
  id: string
  reporter_id: string
  reported_user_id: string | null
  target_type: string
  target_id: string
  reason: string
  description: string | null
  status: string
  created_at: string
  reporter: { username: string }
  reported_user: { username: string } | null
}

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [filter, setFilter] = useState("pending")
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchReports()
  }, [filter])

  async function fetchReports() {
    const { data: rawReports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false })

    if (error || !rawReports) {
      setReports([])
      return
    }

    const userIds = Array.from(
      new Set(
        rawReports
          .flatMap((r: any) => [r.reporter_id, r.reported_user_id])
          .filter((id: string | null) => typeof id === "string" && id.length > 0),
      ),
    )

    const { data: profiles } =
      userIds.length > 0 ? await supabase.from("profiles").select("id, username").in("id", userIds) : { data: [] as any[] }

    const usernamesById = new Map<string, string>((profiles || []).map((p: any) => [p.id, p.username || "Unknown"]))

    setReports(
      rawReports.map((r: any) => ({
        ...r,
        reporter: { username: usernamesById.get(r.reporter_id) || "Unknown" },
        reported_user: r.reported_user_id ? { username: usernamesById.get(r.reported_user_id) || "Unknown" } : null,
      })),
    )
  }

  async function updateReportStatus(reportId: string, status: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from("reports")
      .update({
        status,
        reviewed_by: user.id,
        resolution_notes: resolutionNotes.trim() || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId)

    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: `report_${status}`,
      target_type: "report",
      target_id: reportId,
      details: { resolution_notes: resolutionNotes },
    })

    setResolutionNotes("")
    setSelectedReport(null)
    fetchReports()
  }

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    reviewing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    resolved: "bg-green-500/10 text-green-500 border-green-500/20",
    dismissed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  }

  const reasonLabels: Record<string, string> = {
    spam: "Spam",
    harassment: "Harassment",
    inappropriate: "Inappropriate",
    cheating: "Cheating",
    offensive: "Offensive",
    other: "Other",
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-balance mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Moderation Dashboard
          </span>
        </h1>
        <p className="text-muted-foreground">Review and manage community reports</p>
      </div>

      <Tabs defaultValue="pending" className="w-full" onValueChange={setFilter}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <CardTitle className="text-lg">
                          {reasonLabels[report.reason]} - {report.target_type.replace("_", " ")}
                        </CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Reported by <strong>{report.reporter.username}</strong> on{" "}
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                      {report.reported_user && (
                        <p className="text-sm text-muted-foreground">
                          Target user: <strong>{report.reported_user.username}</strong>
                        </p>
                      )}
                    </div>
                    <Badge className={statusColors[report.status as keyof typeof statusColors]}>{report.status}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {report.description && (
                    <div className="p-3 rounded-lg bg-background/50 border border-border">
                      <p className="text-sm">
                        <strong>Details:</strong> {report.description}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Type: {report.target_type}</Badge>
                    <Badge variant="outline">ID: {report.target_id.substring(0, 8)}...</Badge>
                  </div>

                  {filter === "pending" && selectedReport !== report.id && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedReport(report.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  )}

                  {selectedReport === report.id && (
                    <div className="space-y-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <Textarea
                        placeholder="Add resolution notes..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateReportStatus(report.id, "resolved")}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Resolve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateReportStatus(report.id, "dismissed")}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedReport(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {reports.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">No reports in this category</CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
