"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format, isAfter, isBefore } from "date-fns"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

    return `${formattedStart} ? ${format(end, "PPpp")}`
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

  useEffect(() => {
    const channel = supabase
      .channel("admin-events-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        fetchEvents({ withSpinner: false })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEvents])

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
        throw new Error(detail?.error ?? "Failed to delete event")
      }

      toast.success("Event deleted")
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

    try {
      const response = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, status: nextStatus }),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.error ?? "Failed to update status")
      }

      toast.success(`Event ${nextStatus === "published" ? "published" : "unpublished"}`)
      fetchEvents({ withSpinner: false })
    } catch (error) {
      console.error("Error updating status", error)
      toast.error(error instanceof Error ? error.message : "Failed to update status")
    }
  }

  const toggleVisibility = async (event: AdminEvent) => {
    const nextVisibility = event.visibility === "public" ? "private" : "public"

    try {
      const response = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, visibility: nextVisibility }),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.error ?? "Failed to update visibility")
      }

      toast.success(`Event is now ${nextVisibility}`)
      fetchEvents({ withSpinner: false })
    } catch (error) {
      console.error("Error updating visibility", error)
      toast.error(error instanceof Error ? error.message : "Failed to update visibility")
    }
  }

  const toggleFeatured = async (event: AdminEvent) => {
    try {
      const response = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, is_featured: !event.is_featured }),
      })

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail?.error ?? "Failed to update featured state")
      }

      toast.success(!event.is_featured ? "Event marked as featured" : "Event removed from featured")
      fetchEvents({ withSpinner: false })
    } catch (error) {
      console.error("Error updating featured state", error)
      toast.error(error instanceof Error ? error.message : "Failed to update featured state")
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage past and upcoming programs. New entries sync to the public site instantly.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total events</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <CardDescription>Events tracked in the system</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
            <CardDescription>Visible on the public site</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <CardDescription>Start date is in the future</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past events</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.past}</div>
            <CardDescription>Completed programs</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl font-semibold">Event timeline</CardTitle>
            <CardDescription>Toggle visibility or publish state directly from the list.</CardDescription>
          </div>
          <Badge variant="outline">Real-time sync</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading events...
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No events yet. Create your first one to kickstart the timeline.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Event</TableHead>
                    <TableHead className="min-w-[220px]">Schedule</TableHead>
                    <TableHead className="min-w-[140px]">Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            {event.title}
                            {event.is_featured && (
                              <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                                Featured
                              </span>
                            )}
                          </div>
                          {event.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{event.summary}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatRange(event.start_at, event.end_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          {event.is_virtual ? (
                            <>
                              <Globe2 className="h-3.5 w-3.5" />
                              Virtual
                            </>
                          ) : (
                            <>
                              <MapPin className="h-3.5 w-3.5" />
                              {event.city || event.location || "Onsite"}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={event.status === "published" ? "default" : event.status === "draft" ? "secondary" : "outline"}
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={event.visibility === "public" ? "outline" : "secondary"}>
                          {event.visibility}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatus(event)}
                            className="w-24"
                          >
                            {event.status === "published" ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleVisibility(event)}
                            className="w-20"
                          >
                            {event.visibility === "public" ? "Hide" : "Show"}
                          </Button>
                          <Button
                            variant={event.is_featured ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => toggleFeatured(event)}
                          >
                            <Star className={`mr-1 h-3.5 w-3.5 ${event.is_featured ? "fill-current" : ""}`} />
                            Highlight
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(event)}
                          >
                            <Edit2 className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(event.id, event.title)}
                            disabled={deletingId === event.id}
                          >
                            {deletingId === event.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Delete
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Add new event" : "Edit event"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Leadership Summit 2025"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formState.subtitle}
                onChange={(event) => setFormState((prev) => ({ ...prev, subtitle: event.target.value }))}
                placeholder="Inspiring bold ideas"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={formState.summary}
                onChange={(event) => setFormState((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="Short teaser that appears in listings"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Full overview for the event detail view"
                rows={5}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startAt">Start</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={formState.startAt}
                  onChange={(event) => setFormState((prev) => ({ ...prev, startAt: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endAt">End</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={formState.endAt}
                  onChange={(event) => setFormState((prev) => ({ ...prev, endAt: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formState.city}
                  onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="Lagos"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formState.country}
                  onChange={(event) => setFormState((prev) => ({ ...prev, country: event.target.value }))}
                  placeholder="Nigeria"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Venue / URL</Label>
                <Input
                  id="location"
                  value={formState.location}
                  onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                  placeholder="Eko Convention Centre"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Virtual event</p>
                <p className="text-xs text-muted-foreground">Switch on for online-only experiences.</p>
              </div>
              <Switch
                checked={formState.isVirtual}
                onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isVirtual: checked }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="registrationUrl">Registration link</Label>
                <Input
                  id="registrationUrl"
                  value={formState.registrationUrl}
                  onChange={(event) => setFormState((prev) => ({ ...prev, registrationUrl: event.target.value }))}
                  placeholder="https://example.com/register"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="registrationLabel">Button label</Label>
                <Input
                  id="registrationLabel"
                  value={formState.registrationLabel}
                  onChange={(event) => setFormState((prev) => ({ ...prev, registrationLabel: event.target.value }))}
                  placeholder="Register"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="featuredImageUrl">Cover image URL</Label>
              <Input
                id="featuredImageUrl"
                value={formState.featuredImageUrl}
                onChange={(event) => setFormState((prev) => ({ ...prev, featuredImageUrl: event.target.value }))}
                placeholder="https://images.example.com/event.jpg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formState.tags}
                  onChange={(event) => setFormState((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="leadership, innovation"
                />
                <span className="text-xs text-muted-foreground">Comma separated keywords</span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={formState.capacity}
                  onChange={(event) => setFormState((prev) => ({ ...prev, capacity: event.target.value }))}
                  placeholder="250"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(status: "draft" | "published" | "archived") =>
                    setFormState((prev) => ({ ...prev, status }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Visibility</Label>
                <Select
                  value={formState.visibility}
                  onValueChange={(visibility: "public" | "private") =>
                    setFormState((prev) => ({ ...prev, visibility }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Feature on homepage</p>
                <p className="text-xs text-muted-foreground">Highlighted events show up in hero sections.</p>
              </div>
              <Switch
                checked={formState.isFeatured}
                onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isFeatured: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create event" : "Save changes"}
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
