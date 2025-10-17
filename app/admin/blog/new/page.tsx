"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { ArrowLeft, ImageIcon, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { MediumRichEditor } from "@/components/editor/medium-rich-editor"

const postSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  coverImage: z.string().optional(),
  isFeatured: z.boolean(),
  status: z.enum(["draft", "published"]),
  tags: z.string().optional(),
})

type PostFormValues = z.infer<typeof postSchema>

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

const serializeTags = (value: string | undefined) =>
  value
    ? value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : []

export default function CreatePostPage() {
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [slugLocked, setSlugLocked] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      coverImage: "",
      isFeatured: false,
      status: "draft",
      tags: "",
    },
  })

  const contentValue = watch("content")
  const coverImageValue = watch("coverImage")
  const isFeatured = watch("isFeatured")
  const statusValue = watch("status")

  const estimatedReadingTime = useMemo(() => {
    const plain = contentValue.replace(/<[^>]+>/g, " ")
    const words = plain.split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / 180))
  }, [contentValue])

  const {
    ref: titleRef,
    onChange: titleOnChange,
    ...titleRest
  } = register("title")

  const {
    ref: slugRef,
    onChange: slugOnChange,
    ...slugRest
  } = register("slug")

  useEffect(() => {
    if (!slugLocked) {
      const currentTitle = watch("title")
      if (currentTitle) {
        setValue("slug", slugify(currentTitle), { shouldDirty: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugLocked, watch("title")])

  const handleCoverUpload = async (file: File) => {
    try {
      setCoverUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Failed to upload cover image")
      }

      setValue("coverImage", payload.url, { shouldDirty: true })
      toast.success("Cover image uploaded")
    } catch (error) {
      console.error("[blog-new] cover upload failed", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload cover image")
    } finally {
      setCoverUploading(false)
    }
  }

  const onSubmit = async (data: PostFormValues) => {
    setIsSubmitting(true)
    const toastId = "creating-post"

    try {
      toast.loading("Publishing story...", { id: toastId })

      const tagsArray = serializeTags(data.tags)

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          slug: data.slug,
          content: data.content,
          cover_image: data.coverImage || null,
          is_featured: data.isFeatured,
          status: data.status,
          tags: tagsArray,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        const message = payload?.message ?? payload?.error ?? "Failed to create post"
        throw new Error(message)
      }

      toast.success("Story saved", { id: toastId })
      router.push("/admin/blog")
      router.refresh()
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create post", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-10 pb-24">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-sky-500/10 to-purple-500/15 p-8 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),transparent_55%)]" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-emerald-200/80">Create Story</p>
              <h1 className="mt-2 text-4xl font-semibold text-white md:text-5xl">Compose a new spotlight</h1>
              <p className="mt-3 max-w-2xl text-lg text-emerald-100/80">
                Craft a narrative that celebrates our fellows. Rich formatting, high-res imagery, and SEO-ready metadata
                all in one place.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-100 hover:bg-emerald-500/20"
              onClick={() => router.push("/admin/blog")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to blog board
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-emerald-100/80">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 px-3 py-1">
              <Sparkles className="h-4 w-4 text-emerald-200" />
              {estimatedReadingTime} min read
            </span>
            <span className="rounded-full border border-emerald-200/40 px-3 py-1 text-xs uppercase tracking-[0.35em]">
              Status: {statusValue}
            </span>
          </div>
        </div>
      </section>

      <form id="blog-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-white/10 bg-black/40 backdrop-blur">
          <CardContent className="space-y-10 p-8">
            <div className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-sm font-semibold text-zinc-100">
                  Headline
                </Label>
                <Input
                  id="title"
                  placeholder="Write a headline that sparks curiosity"
                  className="h-14 border-zinc-700/50 bg-black/40 text-xl font-medium text-white"
                  ref={titleRef}
                  {...titleRest}
                  onChange={(event) => {
                    titleOnChange(event)
                    if (!slugLocked) {
                      setValue("slug", slugify(event.target.value), { shouldDirty: true })
                    }
                  }}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-zinc-100">Cover image</Label>
                <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70">
                  {coverImageValue ? (
                    <img
                      src={coverImageValue}
                      alt="Cover preview"
                      className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-72 w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.15),_transparent_70%)] text-zinc-400">
                      <ImageIcon className="h-10 w-10 text-emerald-300" />
                      <p className="text-sm">Add a hero image that sets the tone</p>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
                    <div className="text-xs uppercase tracking-[0.35em] text-white/80">
                      {coverImageValue ? "Change cover" : "Add cover"}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 text-black hover:bg-white"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={coverUploading}
                    >
                      {coverUploading ? "Uploading…" : "Upload"}
                    </Button>
                  </div>
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const [file] = event.target.files ?? []
                    if (file) {
                      await handleCoverUpload(file)
                      event.target.value = ""
                    }
                  }}
                />
                {errors.coverImage && <p className="text-sm text-red-500">{errors.coverImage.message}</p>}
              </div>

              <div className="space-y-3">
                <Label htmlFor="content" className="text-sm font-semibold text-zinc-100">
                  Story body
                </Label>
                <MediumRichEditor
                  value={contentValue}
                  onChange={(html) => setValue("content", html, { shouldDirty: true })}
                  placeholder="Share a transformative experience, include quotes, embed visuals…"
                />
                {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-black/50 backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-100">Slug</Label>
                <Input
                  id="slug"
                  placeholder="unique-story-slug"
                  className="border-zinc-800 bg-black/60"
                  ref={slugRef}
                  {...slugRest}
                  onChange={(event) => {
                    setSlugLocked(true)
                    slugOnChange(event)
                  }}
                />
                <p className="text-xs text-zinc-500">Used for the public URL. Auto-generated from the headline.</p>
                {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-100">Status</Label>
                <select
                  value={statusValue}
                  onChange={(event) => setValue("status", event.target.value as "draft" | "published", { shouldDirty: true })}
                  className="w-full rounded-lg border border-zinc-800 bg-black/60 px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="draft">Draft (hidden)</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-zinc-800/70 bg-black/40 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-100">Feature on homepage</p>
                  <p className="text-xs text-zinc-500">
                    Highlight this story in the hero carousel and newsletter.
                  </p>
                </div>
                <Switch checked={isFeatured} onCheckedChange={(checked) => setValue("isFeatured", checked, { shouldDirty: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-semibold text-zinc-100">
                  Tags
                </Label>
                <Input
                  id="tags"
                  placeholder="leadership, climate action, edtech"
                  className="border-zinc-800 bg-black/60"
                  {...register("tags")}
                />
                <p className="text-xs text-zinc-500">Comma separated keywords that help SEO and filtering.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-black/50 backdrop-blur">
            <CardContent className="space-y-4 p-6 text-sm text-zinc-400">
              <div className="space-y-1">
                <p className="font-semibold text-zinc-100">Publishing tips</p>
                <ul className="space-y-2 text-xs leading-6">
                  <li>• Aim for at least 600 words with vivid examples.</li>
                  <li>• Include at least one compelling quote.</li>
                  <li>• Feature high-resolution imagery (1200 x 600).</li>
                </ul>
              </div>
              <div className="rounded-xl border border-zinc-800/70 bg-black/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">Preview</p>
                <p className="mt-2 text-sm text-zinc-200 line-clamp-3">
                  {contentValue.replace(/<[^>]+>/g, " ").trim() || "Your story preview will appear here once you start writing."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-6 py-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/70 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-[0.35em]">
              {statusValue}
            </span>
            <span>{serializeTags(watch("tags")).length || 0} tags</span>
            <span>{estimatedReadingTime} min read</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-300 hover:bg-zinc-800/80"
              onClick={() => router.push("/admin/blog")}
              disabled={isSubmitting}
            >
              Discard
            </Button>
            <Button type="submit" form="blog-form" disabled={isSubmitting} className="px-6">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                "Publish story"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
