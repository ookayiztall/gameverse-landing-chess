"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Calendar as CalendarIcon, Users, MapPin, Edit2, Clock } from "lucide-react"

type EventItem = {
  id: number
  title: string
  date: string
  time: string
  description: string
  participants: number
  maxParticipants: number
  game: string
  status: "upcoming" | "live" | "completed"
}

const initialEvents: EventItem[] = [
  {
    id: 1,
    title: "Family Tournament",
    date: "Tomorrow",
    time: "8:00 PM",
    description: "Compete in our monthly family tournament with exciting prizes",
    participants: 24,
    maxParticipants: 32,
    game: "Chess Masters",
    status: "upcoming",
  },
  {
    id: 2,
    title: "Quiz Night",
    date: "Friday",
    time: "6:00 PM",
    description: "Test your knowledge across various topics",
    participants: 18,
    maxParticipants: 20,
    game: "Trivia Masters",
    status: "upcoming",
  },
  {
    id: 3,
    title: "Poker Championship",
    date: "Next Saturday",
    time: "7:00 PM",
    description: "High-stakes poker tournament for experienced players",
    participants: 16,
    maxParticipants: 20,
    game: "Poker Night",
    status: "upcoming",
  },
]

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function buildTimeOptions(stepMinutes: number) {
  const options: Array<{ label: string; minutes: number }> = []
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours24 = Math.floor(minutes / 60)
    const mins = minutes % 60
    const hours12 = ((hours24 + 11) % 12) + 1
    const suffix = hours24 < 12 ? "AM" : "PM"
    const label = `${hours12}:${mins.toString().padStart(2, "0")} ${suffix}`
    options.push({ label, minutes })
  }
  return options
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(initialEvents)
  const [createOpen, setCreateOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [joinedEventIds, setJoinedEventIds] = useState<Set<number>>(() => new Set())
  const [createForm, setCreateForm] = useState({
    title: "",
    date: "",
    time: "",
    description: "",
    game: "",
    maxParticipants: "20",
  })
  const timeOptions = useMemo(() => buildTimeOptions(15), [])
  const { toast } = useToast()

  const joinEvent = (eventId: number) => {
    const event = events.find((e) => e.id === eventId)
    if (!event) return

    if (joinedEventIds.has(eventId)) {
      toast({ title: "Already joined" })
      return
    }

    if (event.participants >= event.maxParticipants) {
      toast({ title: "Event is full", variant: "destructive" })
      return
    }

    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, participants: Math.min(e.participants + 1, e.maxParticipants) } : e)),
    )
    setJoinedEventIds((prev) => {
      const next = new Set(prev)
      next.add(eventId)
      return next
    })
    toast({ title: "Joined event" })
  }

  const createEvent = () => {
    const title = createForm.title.trim()
    const date = createForm.date.trim()
    const time = createForm.time.trim()
    const description = createForm.description.trim()
    const game = createForm.game.trim()
    const maxParticipants = Number.parseInt(createForm.maxParticipants, 10)

    if (!title || !date || !time || !game) return
    if (!Number.isFinite(maxParticipants) || maxParticipants <= 0) return

    const next: EventItem = {
      id: Date.now(),
      title,
      date,
      time,
      description: description || "New event",
      participants: 0,
      maxParticipants,
      game,
      status: "upcoming",
    }

    setEvents((prev) => [next, ...prev])
    setCreateOpen(false)
    setSelectedDate(undefined)
    setCreateForm({
      title: "",
      date: "",
      time: "",
      description: "",
      game: "",
      maxParticipants: "20",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-accent" />
              <h1 className="text-4xl font-bold glow-text">Events</h1>
            </div>
            <p className="text-muted-foreground">Family & friends gaming events</p>
          </div>
          <Button
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 hidden md:flex"
            onClick={() => setCreateOpen(true)}
          >
            <Edit2 className="w-4 h-4" />
            Create Event
          </Button>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <Card
              key={event.id}
              className="bg-card/50 border-border/50 backdrop-blur hover:border-primary/30 transition-all overflow-hidden group"
            >
              {/* Card Header with gradient */}
              <div className="h-24 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20"></div>

              {/* Card Content */}
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {event.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                </div>

                {/* Event Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <span>
                      {event.date} at <span className="font-semibold text-foreground">{event.time}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span className="font-semibold text-foreground">{event.game}</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4 text-secondary" />
                    <span>
                      <span className="font-semibold text-foreground">{event.participants}</span> /{" "}
                      {event.maxParticipants} joined
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="w-full bg-background/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                      style={{ width: `${(event.participants / event.maxParticipants) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-4"
                  onClick={() => joinEvent(event.id)}
                  disabled={joinedEventIds.has(event.id) || event.participants >= event.maxParticipants}
                >
                  {joinedEventIds.has(event.id) ? "Joined" : event.participants >= event.maxParticipants ? "Full" : "Join Event"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Create Event Mobile Button */}
        <div className="md:hidden">
          <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2 h-12" onClick={() => setCreateOpen(true)}>
            <Edit2 className="w-4 h-4" />
            Create Event
          </Button>
        </div>

        {/* Calendar View Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Upcoming Calendar</h2>
          <Card className="bg-card/50 border-border/50 backdrop-blur p-6">
            <div className="grid grid-cols-7 gap-2 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="font-semibold text-muted-foreground text-sm py-2">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {Array.from({ length: 35 }).map((_, idx) => {
                const day = idx - 2 // Adjust to start on the right day
                const hasEvent = day === 1 || day === 5 || day === 13
                return (
                  <div
                    key={idx}
                    className={`aspect-square p-2 rounded-lg flex items-center justify-center text-sm ${
                      day < 1 || day > 30
                        ? "text-muted-foreground/30"
                        : hasEvent
                          ? "bg-primary/30 border border-primary/50 font-semibold text-primary"
                          : "hover:bg-primary/10 text-foreground"
                    }`}
                  >
                    {day > 0 && day <= 30 ? day : ""}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create event</DialogTitle>
            <DialogDescription>Add a new event to the list.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="event-date">Date</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button id="event-date" variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {createForm.date ? (
                        createForm.date
                      ) : (
                        <span className="text-muted-foreground">Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date)
                        if (date) {
                          setCreateForm((prev) => ({ ...prev, date: formatDateLabel(date) }))
                          setDateOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-time">Time</Label>
                <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                  <PopoverTrigger asChild>
                    <Button id="event-time" variant="outline" className="justify-start text-left font-normal">
                      <Clock className="mr-2 h-4 w-4" />
                      {createForm.time ? (
                        createForm.time
                      ) : (
                        <span className="text-muted-foreground">Pick a time</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <ScrollArea className="h-64">
                      <div className="grid gap-1">
                        {timeOptions.map((option) => (
                          <Button
                            key={option.minutes}
                            variant="ghost"
                            className="justify-start"
                            onClick={() => {
                              setCreateForm((prev) => ({ ...prev, time: option.label }))
                              setTimeOpen(false)
                            }}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-game">Game</Label>
              <Input
                id="event-game"
                value={createForm.game}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, game: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-max">Max participants</Label>
              <Input
                id="event-max"
                inputMode="numeric"
                value={createForm.maxParticipants}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, maxParticipants: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createEvent} disabled={!createForm.title.trim() || !createForm.date.trim() || !createForm.time.trim() || !createForm.game.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
