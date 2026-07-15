"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
    Megaphone,
    Plus,
    Loader2,
    Trash2,
    Edit2,
    ExternalLink,
    Eye,
    EyeOff,
    Upload,
    Image as ImageIcon
} from "lucide-react"

import { LightRichEditor } from "@/components/editor/light-rich-editor"

type Announcement = {
    id: string
    title: string
    content: string | null
    image_url: string | null
    cta_label: string
    cta_url: string | null
    status: "draft" | "published"
    is_active: boolean
    scheduled_at: string | null
    slug: string | null
    created_at: string
    updated_at: string
}

const defaultForm = () => ({
    id: undefined as string | undefined,
    title: "",
    content: "",
    image_url: "",
    cta_label: "Learn More",
    cta_url: "",
    status: "published" as "draft" | "published",
    is_active: true,
    scheduled_at: "",
    slug: "",
})

type AnnouncementFormState = ReturnType<typeof defaultForm>

function AdminAnnouncementsPageContent() {
    const router = useRouter()
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [formState, setFormState] = useState<AnnouncementFormState>(defaultForm)
    const [submitting, setSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
    const [mode, setMode] = useState<"create" | "edit">("create")
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/announcements?scope=admin")
            if (!response.ok) throw new Error("Failed to fetch announcements")
            const data = await response.json()
            setAnnouncements(data)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load announcements")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAnnouncements()
    }, [fetchAnnouncements])

    const openCreateDialog = () => {
        setMode("create")
        setFormState(defaultForm())
        setImageFile(null)
        setImagePreview(null)
        setDialogOpen(true)
    }

    const openEditDialog = (a: Announcement) => {
        setMode("edit")
        setFormState({
            id: a.id,
            title: a.title,
            content: a.content || "",
            image_url: a.image_url || "",
            cta_label: a.cta_label,
            cta_url: a.cta_url || "",
            status: a.status,
            is_active: a.is_active,
            scheduled_at: a.scheduled_at ? new Date(a.scheduled_at).toISOString().slice(0, 16) : "",
            slug: a.slug || "",
        })
        setImageFile(null)
        setImagePreview(a.image_url)
        setDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!formState.title.trim()) {
            toast.error("Title is required")
            return
        }

        try {
            setSubmitting(true)

            let finalImageUrl = formState.image_url

            if (imageFile) {
                const formData = new FormData()
                formData.append('image', imageFile)
                formData.append('resource_id', mode === 'create' ? 'new-announcement' : (formState.id || 'new'))
                formData.append('bucket', 'uploads')

                const uploadResponse = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData,
                })

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json()
                    finalImageUrl = uploadResult.imageUrl
                } else {
                    toast.error("Image upload failed, using existing URL if any")
                }
            }

            const response = await fetch("/api/announcements", {
                method: mode === "create" ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formState, image_url: finalImageUrl }),
            })

            if (!response.ok) throw new Error("Failed to save announcement")

            toast.success(mode === "create" ? "Announcement created" : "Announcement updated")
            setDialogOpen(false)
            fetchAnnouncements()
        } catch (error) {
            toast.error("Failed to save announcement")
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id)
            const response = await fetch("/api/announcements", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            })

            if (!response.ok) throw new Error("Failed to delete")

            toast.success("Announcement deleted")
            fetchAnnouncements()
        } catch (error) {
            toast.error("Failed to delete")
        } finally {
            setDeletingId(null)
            setDeleteTarget(null)
        }
    }

    const toggleActive = async (a: Announcement) => {
        try {
            const response = await fetch("/api/announcements", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: a.id, is_active: !a.is_active }),
            })
            if (!response.ok) throw new Error("Failed to update")
            fetchAnnouncements()
        } catch (error) {
            toast.error("Failed to update status")
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-zinc-900 leading-none">
                        Announcements
                    </h1>
                    <p className="text-zinc-500 text-sm mt-2">
                        Manage homepage banners and important calls to action.
                    </p>
                </div>

                <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 px-6 shadow-lg shadow-orange-200">
                    <Plus className="mr-2 h-5 w-5" />
                    New Announcement
                </Button>
            </div>

            <Card className="border-zinc-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-zinc-50/50 border-b border-zinc-200">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-orange-600" />
                        Live Announcements
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="divide-y divide-zinc-100">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                                    <div className="h-12 w-12 rounded-lg bg-zinc-100 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3.5 w-1/2 rounded bg-zinc-100" />
                                        <div className="h-2.5 w-2/3 rounded bg-zinc-100" />
                                    </div>
                                    <div className="h-6 w-20 rounded-full bg-zinc-100 hidden sm:block" />
                                    <div className="h-8 w-16 rounded-lg bg-zinc-100" />
                                </div>
                            ))}
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center">
                                <Megaphone className="h-7 w-7 text-orange-500" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-zinc-800">No announcements yet</p>
                                <p className="text-sm text-zinc-500 max-w-xs">Create your first announcement to feature it on the homepage.</p>
                            </div>
                            <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md shadow-orange-200">
                                <Plus className="mr-2 h-4 w-4" />
                                New Announcement
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop / tablet table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-zinc-50/70">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[300px]">Details</TableHead>
                                            <TableHead>CTA</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Visibility</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {announcements.map((a) => (
                                            <TableRow key={a.id} className="group transition-colors hover:bg-orange-50/40">
                                                <TableCell>
                                                    <div className="flex items-center gap-4">
                                                        {a.image_url && (
                                                            <div className="h-12 w-12 rounded-lg bg-zinc-100 overflow-hidden shrink-0">
                                                                <img src={a.image_url} alt={a.title} className="h-full w-full object-cover" />
                                                            </div>
                                                        )}
                                                        <div className="space-y-1 min-w-0">
                                                            <p className="font-bold text-zinc-900 line-clamp-1">{a.title}</p>
                                                            <p className="text-xs text-zinc-500 line-clamp-1">{a.content}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium text-zinc-700">
                                                        {a.cta_label}
                                                        {a.cta_url && (
                                                            <a href={a.cta_url} target="_blank" rel="noopener noreferrer" aria-label="Open CTA link" className="ml-1 inline-block text-zinc-400 hover:text-orange-600">
                                                                <ExternalLink className="h-3 w-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                                                            a.status === "published"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : "bg-zinc-100 text-zinc-600 border-zinc-200"
                                                        )}
                                                    >
                                                        {a.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleActive(a)}
                                                        aria-label={a.is_active ? "Hide announcement" : "Show announcement"}
                                                        className={cn(
                                                            "h-8 gap-2 rounded-full border",
                                                            a.is_active
                                                                ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                                                                : "text-zinc-400 bg-zinc-50 border-zinc-100"
                                                        )}
                                                    >
                                                        {a.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                        <span className="text-[10px] font-bold uppercase">{a.is_active ? "Visible" : "Hidden"}</span>
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditDialog(a)}
                                                            aria-label={`Edit ${a.title}`}
                                                            className="h-9 w-9 rounded-xl hover:bg-zinc-100"
                                                        >
                                                            <Edit2 className="h-4 w-4 text-zinc-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setDeleteTarget(a)}
                                                            disabled={deletingId === a.id}
                                                            aria-label={`Delete ${a.title}`}
                                                            className="h-9 w-9 rounded-xl hover:bg-rose-50 hover:text-rose-600"
                                                        >
                                                            {deletingId === a.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4 text-zinc-400" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile stacked cards */}
                            <div className="md:hidden divide-y divide-zinc-100">
                                {announcements.map((a) => (
                                    <div key={a.id} className="p-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            {a.image_url && (
                                                <div className="h-12 w-12 rounded-lg bg-zinc-100 overflow-hidden shrink-0">
                                                    <img src={a.image_url} alt={a.title} className="h-full w-full object-cover" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-zinc-900 line-clamp-2 leading-snug">{a.title}</p>
                                                <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{a.content}</p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                    a.status === "published"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                                                )}
                                            >
                                                {a.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-zinc-600">
                                            <span className="font-medium truncate">
                                                {a.cta_label}
                                                {a.cta_url && (
                                                    <a href={a.cta_url} target="_blank" rel="noopener noreferrer" aria-label="Open CTA link" className="ml-1 inline-block text-zinc-400 hover:text-orange-600">
                                                        <ExternalLink className="inline h-3 w-3" />
                                                    </a>
                                                )}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleActive(a)}
                                                aria-label={a.is_active ? "Hide announcement" : "Show announcement"}
                                                className={cn(
                                                    "h-8 gap-2 rounded-full border",
                                                    a.is_active
                                                        ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                                                        : "text-zinc-400 bg-zinc-50 border-zinc-100"
                                                )}
                                            >
                                                {a.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                <span className="text-[10px] font-bold uppercase">{a.is_active ? "Visible" : "Hidden"}</span>
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditDialog(a)}
                                                className="flex-1 rounded-xl border-zinc-200 text-zinc-700"
                                            >
                                                <Edit2 className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDeleteTarget(a)}
                                                disabled={deletingId === a.id}
                                                aria-label={`Delete ${a.title}`}
                                                className="rounded-xl border-zinc-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                            >
                                                {deletingId === a.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <DialogHeader className="p-8 bg-zinc-50 border-b border-zinc-100">
                        <DialogTitle className="text-2xl font-black text-zinc-900">
                            {mode === "create" ? "Create Announcement" : "Edit Announcement"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <Label className="text-sm font-bold text-zinc-700">Announcement Title</Label>
                                <Input
                                    placeholder="E.g. Applications for 2026 Cohort are open!"
                                    value={formState.title}
                                    onChange={(e) => setFormState(p => ({ ...p, title: e.target.value }))}
                                    className="rounded-xl border-zinc-200 focus:ring-orange-500 focus:border-orange-500 h-11"
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label className="text-sm font-bold text-zinc-700">Custom URL Slug (Optional)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">/</span>
                                    <Input
                                        placeholder="my-special-announcement"
                                        value={formState.slug}
                                        onChange={(e) => setFormState(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                                        className="pl-6 rounded-xl border-zinc-200 focus:ring-orange-500 focus:border-orange-500 h-11"
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-400 font-medium">Make the URL friendly. e.g. top100afl.com/my-special-announcement</p>
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label className="text-sm font-bold text-zinc-700">Detailed Content</Label>
                                <LightRichEditor
                                    placeholder="Share more details about this announcement..."
                                    value={formState.content}
                                    onChange={(value) => setFormState(p => ({ ...p, content: value }))}
                                />
                            </div>

                            <div className="space-y-4 sm:col-span-2">
                                <Label className="text-sm font-bold text-zinc-700">Display Image (1:1 or 4:5 recommended)</Label>
                                <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/50">
                                    {imagePreview ? (
                                        <div className="relative group rounded-xl overflow-hidden shadow-lg border border-white">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="h-40 w-40 object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Label htmlFor="image-upload" className="cursor-pointer">
                                                    <Upload className="h-8 w-8 text-white" />
                                                </Label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-40 w-40 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-400">
                                            <ImageIcon className="h-12 w-12" />
                                        </div>
                                    )}
                                    <div className="w-full max-w-xs">
                                        <Input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    setImageFile(file)
                                                    setImagePreview(URL.createObjectURL(file))
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full rounded-xl"
                                            onClick={() => document.getElementById('image-upload')?.click()}
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            {imagePreview ? "Change Image" : "Upload Image"}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
                                        Max size: 5MB • Direct upload to secure storage
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-zinc-700">Button Label</Label>
                                <Input
                                    placeholder="Join Now, Sign Up, etc."
                                    value={formState.cta_label}
                                    onChange={(e) => setFormState(p => ({ ...p, cta_label: e.target.value }))}
                                    className="rounded-xl border-zinc-200 focus:ring-orange-500 focus:border-orange-500 h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-zinc-700">Action URL</Label>
                                <Input
                                    placeholder="https://example.com/form"
                                    value={formState.cta_url}
                                    onChange={(e) => setFormState(p => ({ ...p, cta_url: e.target.value }))}
                                    className="rounded-xl border-zinc-200 focus:ring-orange-500 focus:border-orange-500 h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-zinc-700">Status</Label>
                                <Select
                                    value={formState.status}
                                    onValueChange={(v: any) => setFormState(p => ({ ...p, status: v }))}
                                >
                                    <SelectTrigger className="rounded-xl border-zinc-200 h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-zinc-100">
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-zinc-700">Scheduled Publication (Optional)</Label>
                                <Input
                                    type="datetime-local"
                                    value={formState.scheduled_at}
                                    onChange={(e) => setFormState(p => ({ ...p, scheduled_at: e.target.value }))}
                                    className="rounded-xl border-zinc-200 focus:ring-orange-500 focus:border-orange-500 h-11"
                                />
                                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-lg">⚠️ Leave empty to publish immediately. If a future time is set, the announcement will NOT appear on the homepage until that time.</p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-zinc-900">Active Visibility</Label>
                                    <p className="text-xs text-zinc-500">Toggle immediate visibility on homepage</p>
                                </div>
                                <Switch
                                    checked={formState.is_active}
                                    onCheckedChange={(v) => setFormState(p => ({ ...p, is_active: v }))}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-zinc-50 border-t border-zinc-100">
                        <Button
                            variant="ghost"
                            onClick={() => setDialogOpen(false)}
                            className="rounded-xl h-11 px-6 mr-2 font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 px-10 shadow-lg shadow-orange-200 transition-all font-bold"
                        >
                            {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {mode === "create" ? "Launch Announcement" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
                <AlertDialogContent className="bg-white rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-900">Delete this announcement?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-500">
                            {deleteTarget ? (
                                <>&ldquo;{deleteTarget.title}&rdquo; will be permanently removed. This action cannot be undone.</>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => { if (deleteTarget) handleDelete(deleteTarget.id) }}
                            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default function AdminAnnouncementsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminAnnouncementsPageContent />
        </Suspense>
    )
}
