"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format, isAfter, isBefore } from "date-fns"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  Loader2,
  Globe2,
  EyeOff,
  Eye,
  Star,
  Trash2,
  Edit2,
} from "lucide-react"

const formatDateForInput = (value?: string | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const toISOString = (value: string) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString()
}

const normalizeTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

const defaultForm = () => ({
  id: undefined as string | undefined,
  title: "",
  subtitle: "",
  summary: "",
  description: "",
  location: "",
  city: "",
  country: "",
  isVirtual: false,
  startAt: "",
  endAt: "",
  registrationUrl: "",
  registrationLabel: "Register",
  featuredImageUrl: "",
  tags: "",
  capacity: "",
  status: "draft" as "draft" | "published" | "archived",
  visibility: "public" as "public" | "private",
  isFeatured: false,
})

type EventFormState = ReturnType<typeof defaultForm>

type AdminEvent = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string | null
  description: string | null
  location: string | null
  city: string | null
  country: string | null
  is_virtual: boolean
  start_at: string
  end_at: string | null
  registration_url: string | null
  registration_label: string
  featured_image_url: string | null
  tags: string[]
  capacity: number | null
  status: "draft" | "published" | "archived"
  visibility: "public" | "private"
  is_featured: boolean
  created_at: string
  updated_at: string
}

type Stats = {
  total: number
  published: number
  upcoming: number
  past: number
}

const formatRange = (startAt: string, endAt?: string | null) => {
  try {
    const start = new Date(startAt)
    const formattedStart = format(start, "PPpp")

    if (!endAt) return formattedStart

    const end = new Date(endAt)
    if (Number.isNaN(end.getTime())) return formattedStart

    if (format(start, "PP") === format(end, "PP")) {
      return `${formattedStart} - ${format(end, "pp")}`
    }

    return `${formattedStart} – ${format(end, "PPpp")}`
  } catch (error) {
    return startAt
  }
}

const mapEventToForm = (event: AdminEvent): EventFormState => ({
  id: event.id,
  title: event.title ?? "",
  subtitle: event.subtitle ?? "",
  summary: event.summary ?? "",
  description: event.description ?? "",
  location: event.location ?? "",
  city: event.city ?? "",
  country: event.country ?? "",
  isVirtual: Boolean(event.is_virtual),
  startAt: formatDateForInput(event.start_at),
  endAt: formatDateForInput(event.end_at),
  registrationUrl: event.registration_url ?? "",
  registrationLabel: event.registration_label ?? "Register",
  featuredImageUrl: event.featured_image_url ?? "",
  tags: (event.tags ?? []).join(", "),
  capacity: event.capacity ? String(event.capacity) : "",
  status: event.status,
  visibility: event.visibility,
  isFeatured: Boolean(event.is_featured),
})

const buildPayload = (form: EventFormState) => {
  if (!form.title.trim()) {
    throw new Error("Title is required")
  }

  if (!form.startAt) {
    throw new Error("Start date and time is required")
  }

  const startAtIso = toISOString(form.startAt)
  if (!startAtIso) {
    throw new Error("Invalid start date")
  }

  const endAtIso = form.endAt ? toISOString(form.endAt) : null

  return {
    id: form.id,
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || null,
    summary: form.summary.trim() || null,
    description: form.description.trim() || null,
    location: form.location.trim() || null,
    city: form.city.trim() || null,
    country: form.country.trim() || null,
    is_virtual: form.isVirtual,
    start_at: startAtIso,
    end_at: endAtIso,
    registration_url: form.registrationUrl.trim() || null,
    registration_label: form.registrationLabel.trim() || "Register",
    featured_image_url: form.featuredImageUrl.trim() || null,
    tags: normalizeTags(form.tags),
    capacity: form.capacity ? Number.parseInt(form.capacity, 10) : null,
    status: form.status,
    visibility: form.visibility,
    is_featured: form.isFeatured,
    gallery: [],
    metadata: {},
  }
}

const groupEvents = (events: AdminEvent[]): Stats => {
  const now = new Date()

  let upcoming = 0
  let past = 0
  let published = 0

  events.forEach((event) => {
    const start = new Date(event.start_at)

    if (event.status === "published") {
      published += 1
    }

    if (isAfter(start, now)) {
      upcoming += 1
    } else if (isBefore(start, now)) {
      past += 1
    }
  })

  return {
    total: events.length,
    published,
    upcoming,
    past,
  }
}

function AdminEventsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formState, setFormState] = useState<EventFormState>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mode, setMode] = useState<"create" | "edit">("create")
  const createFlag = searchParams.get("create")

  const stats = useMemo(() => groupEvents(events), [events])

  const fetchEvents = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {
    const toastId = "events-loading"

    if (withSpinner) {
      setLoading(true)
      toast.loading("Loading events...", { id: toastId })
    }

    try {
      const response = await fetch("/api/events?scope=admin")
      if (!response.ok) {
        throw new Error("Failed to fetch events")
      }

      const data = (await response.json()) as AdminEvent[]
      setEvents(Array.isArray(data) ? data : [])

      if (withSpinner) {
        toast.success("Events updated", { id: toastId })
      }
    } catch (error) {
      console.error("Error fetching events", error)
      if (withSpinner) {
        toast.error("Unable to load events", { id: toastId })
      } else {
        toast.error("Live update failed, please refresh")
      }
    } finally {
      if (withSpinner) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!createFlag) return
    const normalized = createFlag.toLowerCase()
    if (!dialogOpen && (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "new")) {
      setMode("create")
      setFormState(defaultForm())
      setDialogOpen(true)
      if (pathname) {
        router.replace(pathname)
      }
    }
  }, [createFlag, dialogOpen, pathname, router])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Disabled real-time sync - it was causing issues by reverting local state
  // after optimistic updates. The fetchEvents call after each operation handles sync.
  // useEffect(() => {
  //   const channel = supabase
  //     .channel("admin-events-sync")
  //     .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
  //       fetchEvents({ withSpinner: false })
  //     })
  //     .subscribe()
  //
  //   return () => {
  //     supabase.removeChannel(channel)
  //   }
  // }, [fetchEvents])


  const openCreateDialog = () => {
    setMode("create")
    setFormState(defaultForm())
    setDialogOpen(true)
  }

  const openEditDialog = (event: AdminEvent) => {
    setMode("edit")
    setFormState(mapEventToForm(event))
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (submitting) return
    setDialogOpen(false)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const payload = buildPayload(formState)

      const response = await fetch("/api/events", {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.error ?? "Failed to save event")
      }

      toast.success(mode === "create" ? "Event created" : "Event updated")
      setDialogOpen(false)
      setFormState(defaultForm())
      fetchEvents({ withSpinner: false })
    } catch (error) {
      console.error("Failed to save event", error)
      toast.error(error instanceof Error ? error.message : "Failed to save event")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (deletingId) return
    const confirmed = window.confirm(`Delete event "${title}"?`)
    if (!confirmed) return

    try {
      setDeletingId(id)
      const response = await fetch("/api/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok && response.status !== 204) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.error ?? detail?.message ?? "Failed to delete event")
      }

      // Immediately remove from local state
      setEvents(prev => prev.filter(e => e.id !== id))
      toast.success("Event deleted")

      // Also refresh from server to ensure sync
      fetchEvents({ withSpinner: false })
    } catch (error) {
      console.error("Failed to delete event", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete event")
    } finally {
      setDeletingId(null)
    }
  }


  const toggleStatus = async (event: AdminEvent) => {
    const nextStatus = event.status === "published" ? "draft" : "published"

    // Immediately update local state for instant UI feedback
    setEvents(prev => prev.map(e =>
      e.id === event.id
        ? { ...e, status: nextStatus, is_featured: nextStatus === "draft" ? false : e.is_featured }
        : e
    ))

    try {
      const response = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, status: nextStatus }),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.error ?? detail?.message ?? "Failed to update status")
      }

      // If unpublishing, also remove featured status
      if (nextStatus === "draft" && event.is_featured) {
        await fetch("/api/events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: event.id, is_featured: false }),
        })
      }

      toast.success(`Event ${nextStatus === "published" ? "published" : "unpublished"}`)
      fetchEvents({ withSpinner: false })
    } catch (error) {
      // Revert on error
      setEvents(prev => prev.map(e =>
        e.id === event.id ? { ...e, status: event.status, is_featured: event.is_featured } : e
      ))
      console.error("Error updating status", error)
      toast.error(error instanceof Error ? error.message : "Failed to update status")
    }
  }

  const toggleVisibility = async (event: AdminEvent) => {
    const nextVisibility = event.visibility === "public" ? "private" : "public"

    // Immediately update local state
    setEvents(prev => prev.map(e =>
      e.id === event.id ? { ...e, visibility: nextVisibility } : e
    ))

    try {
      const response = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, visibility: nextVisibility }),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.error ?? detail?.message ?? "Failed to update visibility")
      }

      toast.success(`Event is now ${nextVisibility}`)
      fetchEvents({ withSpinner: false })
    } catch (error) {
      // Revert on error
      setEvents(prev => prev.map(e =>
        e.id === event.id ? { ...e, visibility: event.visibility } : e
      ))
      console.error("Error updating visibility", error)
      toast.error(error instanceof Error ? error.message : "Failed to update visibility")
    }
  }

  const toggleFeatured = async (event: AdminEvent) => {
    const nextFeatured = !event.is_featured

    // Immediately update local state
    setEvents(prev => prev.map(e =>
      e.id === event.id ? { ...e, is_featured: nextFeatured } : e
    ))

    try {
      const response = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, is_featured: nextFeatured }),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.error ?? detail?.message ?? "Failed to update featured state")
      }

      toast.success(nextFeatured ? "Event marked as featured" : "Event removed from featured")
      fetchEvents({ withSpinner: false })
    } catch (error) {
      // Revert on error
      setEvents(prev => prev.map(e =>
        e.id === event.id ? { ...e, is_featured: event.is_featured } : e
      ))
      console.error("Error updating featured state", error)
      toast.error(error instanceof Error ? error.message : "Failed to update featured state")
    }
  }


  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-20 lg:pt-0">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Program Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
            Event <span className="text-amber-500">Registry</span>
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium">
            Coordinate leader gatherings and digital summits.
          </p>
        </div>

        <Button onClick={openCreateDialog} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl h-10 px-4 shadow-lg shadow-amber-500/20">
          <Plus className="mr-1 h-4 w-4" />
          Create Event
        </Button>
      </div>

      {/* KPI Stats Grid - 2x2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPITile
          label="Total Events"
          value={stats.total}
          icon={CalendarDays}
          color="blue"
          subValue="Tracked"
        />
        <KPITile
          label="Active"
          value={stats.published}
          icon={Globe2}
          color="emerald"
          subValue="Public"
        />
        <KPITile
          label="Upcoming"
          value={stats.upcoming}
          icon={Clock}
          color="amber"
          subValue="Scheduled"
        />
        <KPITile
          label="Completed"
          value={stats.past}
          icon={EyeOff}
          color="zinc"
          subValue="Archived"
        />
      </div>

      {/* Main Events Table Card */}
      <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden min-h-[500px]">
        <CardHeader className="border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-zinc-400" />
              Timeline
            </CardTitle>
            <Badge variant="outline" className="bg-emerald-500/5 text-emerald-400 border-emerald-500/20">
              Sync Active
            </Badge>
          </div>
          <CardDescription className="text-zinc-500">
            Real-time overview of all programmed activities.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 space-y-4 text-zinc-500">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
              <p>Loading schedule...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 border-2 border-dashed border-zinc-800 m-8 rounded-2xl">
              <p>No events scheduled. Launch your first program to get started.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-zinc-400 pl-6">Event Details</TableHead>
                      <TableHead className="text-zinc-400">Schedule</TableHead>
                      <TableHead className="text-zinc-400">Location</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Visibility</TableHead>
                      <TableHead className="text-zinc-400 text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="pl-6 py-4">
                          <div className="space-y-1">
                            <div className="font-medium text-zinc-200 flex items-center gap-2 text-base">
                              {event.title}
                              {event.is_featured && (
                                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                                  Featured
                                </span>
                              )}
                            </div>
                            {event.summary && (
                              <p className="text-xs text-zinc-500 line-clamp-1 max-w-[300px]">{event.summary}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-zinc-400 font-mono">
                            {formatRange(event.start_at, event.end_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-zinc-300 flex items-center gap-2">
                            {event.is_virtual ? (
                              <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                                <Globe2 className="h-3 w-3 mr-1" /> Virtual
                              </Badge>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                                {event.city || event.location || "Onsite"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={event.status === "published"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : event.status === "draft"
                                ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                : "bg-red-900/20 text-red-400 border-red-900/30"}
                          >
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-white/10 text-zinc-400">
                            {event.visibility}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStatus(event)}
                              className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/10"
                            >
                              {event.status === "published" ? "Unpublish" : "Publish"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFeatured(event)}
                              className={`h-8 w-8 rounded-lg ${event.is_featured ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-600 hover:text-amber-400'}`}
                            >
                              <Star className={`h-4 w-4 ${event.is_featured ? "fill-current" : ""}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(event)}
                              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(event.id, event.title)}
                              disabled={deletingId === event.id}
                              className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                            >
                              {deletingId === event.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden p-4 space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="relative bg-zinc-950/40 border border-white/5 rounded-3xl p-5 space-y-4 hover:border-amber-500/30 transition-all overflow-hidden">
                    {/* Featured Badge */}
                    {event.is_featured && (
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          <Star className="h-3 w-3 mr-1 fill-current" /> Featured
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white pr-20">{event.title}</h3>
                      {event.summary && (
                        <p className="text-xs text-zinc-500 line-clamp-2">{event.summary}</p>
                      )}
                    </div>

                    <div className="space-y-3 bg-white/5 rounded-2xl p-3 border border-white/5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" /> Schedule
                        </span>
                        <span className="text-white font-mono text-[10px]">{format(new Date(event.start_at), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 flex items-center gap-1.5">
                          {event.is_virtual ? <Globe2 className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                          Location
                        </span>
                        <span className="text-white">{event.is_virtual ? "Virtual" : (event.city || event.location || "Onsite")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              event.status === "published"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700"
                            )}
                          >
                            {event.status}
                          </Badge>
                          <Badge variant="outline" className="border-white/10 text-zinc-400 text-[10px]">
                            {event.visibility}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(event)}
                        className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"
                      >
                        {event.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <div className="flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFeatured(event)}
                          className={cn("h-8 w-8 rounded-full", event.is_featured ? "bg-amber-500/20 text-amber-500" : "bg-white/5 text-zinc-600")}
                        >
                          <Star className={cn("h-4 w-4", event.is_featured && "fill-current")} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)} className="h-8 w-8 rounded-full bg-white/5 text-zinc-400">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id, event.title)} disabled={deletingId === event.id} className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500">
                          {deletingId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-zinc-950 border-white/10 text-white sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{mode === "create" ? "Create New Event" : "Edit Event Details"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-zinc-400">Event Title</Label>
              <Input
                id="title"
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Ex: Leadership Summit 2025"
                className="bg-zinc-900 border-zinc-800 text-white focus:ring-amber-500/50 focus:border-amber-500/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subtitle" className="text-zinc-400">Subtitle</Label>
              <Input
                id="subtitle"
                value={formState.subtitle}
                onChange={(event) => setFormState((prev) => ({ ...prev, subtitle: event.target.value }))}
                placeholder="Inspiring bold ideas"
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary" className="text-zinc-400">Summary (Short)</Label>
              <Textarea
                id="summary"
                value={formState.summary}
                onChange={(event) => setFormState((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="Teaser for list views..."
                rows={2}
                className="bg-zinc-900 border-zinc-800 text-white resize-none"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-zinc-400">Full Description</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Detailed event information..."
                rows={4}
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startAt" className="text-zinc-400">Start Date</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={formState.startAt}
                  onChange={(event) => setFormState((prev) => ({ ...prev, startAt: event.target.value }))}
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endAt" className="text-zinc-400">End Date</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={formState.endAt}
                  onChange={(event) => setFormState((prev) => ({ ...prev, endAt: event.target.value }))}
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
            </div>

            {/* Location Group */}
            <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-zinc-300">Location Settings</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Virtual Event</span>
                  <Switch
                    checked={formState.isVirtual}
                    onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isVirtual: checked }))}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location" className="text-xs text-zinc-500">Venue Name</Label>
                <Input
                  id="location"
                  value={formState.location}
                  onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                  placeholder="Eko Convention Centre"
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city" className="text-xs text-zinc-500">City</Label>
                  <Input
                    id="city"
                    value={formState.city}
                    onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="Lagos"
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country" className="text-xs text-zinc-500">Country</Label>
                  <Input
                    id="country"
                    value={formState.country}
                    onChange={(event) => setFormState((prev) => ({ ...prev, country: event.target.value }))}
                    placeholder="Nigeria"
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="registrationUrl" className="text-zinc-400">Registration Link</Label>
                <Input
                  id="registrationUrl"
                  value={formState.registrationUrl}
                  onChange={(event) => setFormState((prev) => ({ ...prev, registrationUrl: event.target.value }))}
                  placeholder="https://..."
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="registrationLabel" className="text-zinc-400">Button Label</Label>
                <Input
                  id="registrationLabel"
                  value={formState.registrationLabel}
                  onChange={(event) => setFormState((prev) => ({ ...prev, registrationLabel: event.target.value }))}
                  placeholder="Register Now"
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="featuredImageUrl" className="text-zinc-400">Cover Image URL</Label>
              <Input
                id="featuredImageUrl"
                value={formState.featuredImageUrl}
                onChange={(event) => setFormState((prev) => ({ ...prev, featuredImageUrl: event.target.value }))}
                placeholder="https://..."
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tags" className="text-zinc-400">Tags</Label>
                <Input
                  id="tags"
                  value={formState.tags}
                  onChange={(event) => setFormState((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="Leadership, Technology"
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity" className="text-zinc-400">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={formState.capacity}
                  onChange={(event) => setFormState((prev) => ({ ...prev, capacity: event.target.value }))}
                  placeholder="250"
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
              <div className="grid gap-2">
                <Label className="text-zinc-400">Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(status: "draft" | "published" | "archived") =>
                    setFormState((prev) => ({ ...prev, status }))
                  }
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-400">Visibility</Label>
                <Select
                  value={formState.visibility}
                  onValueChange={(visibility: "public" | "private") =>
                    setFormState((prev) => ({ ...prev, visibility }))
                  }
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-amber-500">Spotlight Feature</p>
                <p className="text-xs text-zinc-500">Show this event on the homepage hero section.</p>
              </div>
              <Switch
                checked={formState.isFeatured}
                onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isFeatured: checked }))}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={closeDialog} className="text-zinc-400 hover:text-white hover:bg-white/5">Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create Event" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminEventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading events...
        </div>
      }
    >
      <AdminEventsPageContent />
    </Suspense>
  )
}

function KPITile({ label, value, icon: Icon, color, subValue }: any) {
  const colors: any = {
    blue: "from-blue-600 to-indigo-600 shadow-blue-500/20",
    emerald: "from-emerald-600 to-teal-500 shadow-emerald-500/20",
    amber: "from-orange-500 to-amber-500 shadow-orange-500/20",
    rose: "from-rose-600 to-pink-500 shadow-rose-500/20",
    purple: "from-purple-600 to-indigo-600 shadow-purple-500/20",
    zinc: "from-zinc-700 to-zinc-900 shadow-zinc-500/20",
  }

  const selectedColor = colors[color] || colors.blue

  return (
    <div className={cn(
      "relative p-6 rounded-[2rem] border-none bg-gradient-to-br shadow-xl overflow-hidden transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1 group",
      selectedColor
    )}>
      {/* Background Icon */}
      <Icon className="absolute -right-4 -bottom-4 h-24 w-24 text-white opacity-[0.08] -rotate-12 group-hover:scale-110 transition-transform duration-700" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-4xl font-black text-white tracking-tighter">{value}</p>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{label}</p>
            {subValue && <span className="text-[10px] font-medium text-white/90 bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">{subValue}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
