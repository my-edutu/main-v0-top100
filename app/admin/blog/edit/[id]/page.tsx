"use client"

import { use, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { ArrowLeft, ImageIcon, Loader2, Search, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { MediumRichEditor } from "@/components/editor/medium-rich-editor"
import { processImageForUpload, processCoverImage } from "@/lib/utils/image-processor"

const postSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  coverImage: z.string().optional(),
  coverImageAlt: z.string().optional(),
  isFeatured: z.boolean(),
  status: z.enum(["draft", "published", "scheduled"]),
  tags: z.string().optional(),
  excerpt: z.string().optional(),
  author: z.string().optional(),
  metaTitle: z.string().max(60, "Meta title should be less than 60 characters").optional(),
  metaDescription: z.string().max(160, "Meta description should be less than 160 characters").optional(),
  metaKeywords: z.string().optional(),
  scheduledAt: z.string().optional(),
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

interface AdminPostResponse {
  id: string
  title: string
  slug: string
  content: string
  cover_image?: string | null
  cover_image_alt?: string | null
  is_featured?: boolean | null
  status?: string | null
  tags?: string[] | null
  excerpt?: string | null
  author?: string | null
  meta_title?: string | null
  meta_description?: string | null
  meta_keywords?: string | null
  scheduled_at?: string | null
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [slugLocked, setSlugLocked] = useState(true)
  const [coverUploading, setCoverUploading] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<string>("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    getValues,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      coverImage: "",
      coverImageAlt: "",
      isFeatured: false,
      status: "draft",
      tags: "",
      excerpt: "",
      author: "",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      scheduledAt: "",
    },
  })

  const contentValue = watch("content")
  const coverImageValue = watch("coverImage")
  const coverImageAltValue = watch("coverImageAlt")
  const isFeatured = watch("isFeatured")
  const statusValue = watch("status")
  const metaTitleValue = watch("metaTitle")
  const metaDescriptionValue = watch("metaDescription")

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

  const {
    ref: excerptRef,
    onChange: excerptOnChange,
    ...excerptRest
  } = register("excerpt")

  const {
    ref: authorRef,
    onChange: authorOnChange,
    ...authorRest
  } = register("author")

  useEffect(() => {
    const loadPost = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/posts?scope=admin&id=${id}`, { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Failed to load post")
        }

        const data = (await response.json()) as AdminPostResponse

        const status = data.status === "published" ? "published" :
                      data.status === "scheduled" ? "scheduled" : "draft";

        reset({
          title: data.title ?? "",
          slug: data.slug ?? "",
          content: data.content ?? "",
          coverImage: data.cover_image ?? "",
          coverImageAlt: data.cover_image_alt ?? "",
          isFeatured: Boolean(data.is_featured),
          status: status,
          tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
          excerpt: data.excerpt ?? "",
          author: data.author ?? "",
          metaTitle: data.meta_title ?? "",
          metaDescription: data.meta_description ?? "",
          metaKeywords: data.meta_keywords ?? "",
          scheduledAt: data.scheduled_at ?? "",
        })

        setSlugLocked(true)
        if (data.scheduled_at) {
          setScheduledDate(data.scheduled_at.substring(0, 16)) // format to YYYY-MM-DDTHH:MM
        }
      } catch (error) {
        console.error("Error loading post", error)
        toast.error("Failed to load post details")
        router.push("/admin/blog")
      } finally {
        setIsLoading(false)
      }
    }

    loadPost()
  }, [id, reset, router])

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
      console.log('[blog-edit] Starting cover upload for file:', file.name, 'Size:', file.size)
      setCoverUploading(true)

      // Process the cover image specifically for blog posts
      const { processedFile, validationErrors } = await processCoverImage(
        file,
        {
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1080,
        }
      )

      console.log('[blog-edit] Image processed. New size:', processedFile.size)

      // If there are validation errors even after compression, show them
      if (validationErrors.length > 0) {
        throw new Error(`Image validation failed: ${validationErrors.join(', ')}`);
      }

      const formData = new FormData()
      formData.append("file", processedFile)

      console.log('[blog-edit] Uploading to /api/uploads...')

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      }).catch(fetchError => {
        console.error('[blog-edit] Fetch error details:', fetchError)
        throw new Error(`Network error: ${fetchError.message}. Is the dev server running?`)
      })

      console.log('[blog-edit] Upload response status:', response.status)

      const payload = await response.json().catch(() => null)
      console.log('[blog-edit] Upload response payload:', payload)

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? `Upload failed with status ${response.status}`)
      }

      console.log('[blog-edit] Image uploaded successfully:', payload.url)
      setValue("coverImage", payload.url, { shouldDirty: true })
      toast.success("Cover image uploaded and optimized")
    } catch (error) {
      console.error("[blog-edit] Cover upload error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload cover image")
    } finally {
      setCoverUploading(false)
    }
  }

  const onSubmit = async (data: PostFormValues) => {
    console.log('[blog-edit] ========== FORM SUBMISSION STARTED ==========')
    console.log('[blog-edit] Post ID:', id)
    console.log('[blog-edit] Form data title:', data.title)
    console.log('[blog-edit] Form data slug:', data.slug)
    console.log('[blog-edit] Form data content length:', data.content?.length || 0)
    console.log('[blog-edit] Form data coverImage:', data.coverImage)
    console.log('[blog-edit] Form data status:', data.status)
    console.log('[blog-edit] Full form data:', JSON.stringify(data, null, 2))

    setIsSubmitting(true)
    const toastId = "updating-post"

    try {
      toast.loading("Saving changes...", { id: toastId })

      const tagsArray = serializeTags(data.tags)

      console.log('[blog-edit] Tags array:', tagsArray)
      console.log('[blog-edit] Serialized tags:', JSON.stringify(tagsArray))

      const requestPayload = {
        id: id,
        title: data.title,
        slug: data.slug,
        content: data.content,
        cover_image: data.coverImage || null,
        cover_image_alt: data.coverImageAlt || null,
        is_featured: data.isFeatured,
        status: data.status,
        tags: tagsArray,
        excerpt: data.excerpt || null,
        author: data.author || null,
        meta_title: data.metaTitle || null,
        meta_description: data.metaDescription || null,
        meta_keywords: data.metaKeywords || null,
        scheduled_at: data.status === 'scheduled' ? data.scheduledAt : null,
      }

      console.log('[blog-edit] Request payload JSON:', JSON.stringify(requestPayload, null, 2))

      const response = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      })

      console.log('[blog-edit] Response status:', response.status)
      console.log('[blog-edit] Response statusText:', response.statusText)
      console.log('[blog-edit] Response ok:', response.ok)

      let payload;
      let responseText;
      try {
        responseText = await response.text()
        console.log('[blog-edit] Raw response text:', responseText)

        if (responseText) {
          payload = JSON.parse(responseText)
          console.log('[blog-edit] Parsed payload:', JSON.stringify(payload, null, 2))
        }
      } catch (parseError) {
        // If JSON parsing fails, create an error payload
        console.error("[blog-edit] Failed to parse response JSON:", parseError)
        console.error("[blog-edit] Response text was:", responseText)
        throw new Error(`API response parse error: ${response.status} ${response.statusText}`)
      }

      if (!response.ok) {
        // Log the full error details for debugging
        console.error('[blog-edit] ========== API ERROR ==========')
        console.error('[blog-edit] Status:', response.status)
        console.error('[blog-edit] Status Text:', response.statusText)
        console.error('[blog-edit] Error payload:', JSON.stringify(payload, null, 2))

        // Use the error message from API if available, otherwise create a generic one
        const errorMessage = payload?.message || payload?.error || `Request failed with status ${response.status}`
        throw new Error(errorMessage)
      }

      if (!payload) {
        throw new Error("No response data received from server")
      }

      toast.success("Post updated", { id: toastId })
      router.push("/admin/blog")
      router.refresh()
    } catch (error) {
      console.error('[blog-edit] ========== ERROR CAUGHT ==========')
      console.error('[blog-edit] Error:', error)
      console.error('[blog-edit] Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('[blog-edit] Error stack:', error instanceof Error ? error.stack : 'No stack')
      console.error('[blog-edit] Post data summary:', JSON.stringify({
        id: id,
        title: data.title,
        slug: data.slug,
        hasContent: !!data.content,
        contentLength: data.content?.length || 0,
        coverImage: data.coverImage,
        status: data.status
      }, null, 2))

      // Provide more detailed error feedback
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while updating the post"
      toast.error(`Update failed: ${errorMessage}`, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-24">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-slate-500/15 p-8 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.25),transparent_55%)]" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-indigo-200/80">Edit Story</p>
              <h1 className="mt-2 text-4xl font-semibold text-white md:text-5xl">Update spotlight</h1>
              <p className="mt-3 max-w-2xl text-lg text-indigo-100/80">
                Refine the narrative, refresh media assets, and control homepage visibility in one place.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-100 hover:bg-indigo-500/20"
              onClick={() => router.push("/admin/blog")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to blog board
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-indigo-100/80">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/40 px-3 py-1">
              {estimatedReadingTime} min read
            </span>
            <span className="rounded-full border border-indigo-200/40 px-3 py-1 text-xs uppercase tracking-[0.35em]">
              Status: {statusValue}
            </span>
          </div>
        </div>
      </section>

      <form id="blog-edit-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-white/10 bg-black/40 backdrop-blur">
          <CardContent className="space-y-10 p-8">
            <div className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-sm font-semibold text-zinc-100">
                  Headline
                </Label>
                <Input
                  id="title"
                  placeholder="Update the headline"
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
                <Label htmlFor="excerpt" className="text-sm font-semibold text-zinc-100">
                  Excerpt
                </Label>
                <Input
                  id="excerpt"
                  placeholder="Brief summary of the post content"
                  className="border-zinc-700/50 bg-black/40 text-white"
                  ref={excerptRef}
                  {...excerptRest}
                />
                {errors.excerpt && <p className="text-sm text-red-500">{errors.excerpt.message}</p>}
              </div>

              <div className="space-y-3">
                <Label htmlFor="author" className="text-sm font-semibold text-zinc-100">
                  Author
                </Label>
                <Input
                  id="author"
                  placeholder="Author name"
                  className="border-zinc-700/50 bg-black/40 text-white"
                  ref={authorRef}
                  {...authorRest}
                />
                {errors.author && <p className="text-sm text-red-500">{errors.author.message}</p>}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-zinc-100">Cover image</Label>
                <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70">
                  {coverImageValue ? (
                    <img
                      src={coverImageValue}
                      alt={coverImageAltValue || "Cover preview"}
                      className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-72 w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.15),_transparent_70%)] text-zinc-400">
                      <ImageIcon className="h-10 w-10 text-indigo-300" />
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
                <Label htmlFor="coverImageAlt" className="text-sm font-semibold text-zinc-100">
                  Cover Image Alt Text
                </Label>
                <Input
                  id="coverImageAlt"
                  placeholder="Describe the cover image for accessibility"
                  className="border-zinc-700/50 bg-black/40 text-white"
                  value={coverImageAltValue}
                  onChange={(e) => setValue("coverImageAlt", e.target.value, { shouldDirty: true })}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="content" className="text-sm font-semibold text-zinc-100">
                  Story body
                </Label>
                <MediumRichEditor
                  value={contentValue}
                  onChange={(html) => setValue("content", html, { shouldDirty: true })}
                  placeholder="Refresh the narrative, add quotes, or embed new visuals."
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
                <p className="text-xs text-zinc-500">Used for the public URL.</p>
                {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-100">Status</Label>
                <select
                  value={statusValue}
                  onChange={(event) => {
                    setValue("status", event.target.value as "draft" | "published" | "scheduled", { shouldDirty: true })
                    if (event.target.value !== 'scheduled') {
                      setValue("scheduledAt", "", { shouldDirty: true }) // Clear scheduled date if not scheduled
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-800 bg-black/60 px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="draft">Draft (hidden)</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              {statusValue === 'scheduled' && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-zinc-100">Scheduled Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => {
                      setScheduledDate(e.target.value);
                      setValue("scheduledAt", e.target.value, { shouldDirty: true });
                    }}
                    className="w-full rounded-lg border border-zinc-800 bg-black/60 px-3 py-2 text-sm text-zinc-200"
                  />
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-zinc-800/70 bg-black/40 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-100">Feature on homepage</p>
                  <p className="text-xs text-zinc-500">Toggle to promote this story in the homepage carousel.</p>
                </div>
                <Switch
                  checked={isFeatured}
                  onCheckedChange={(checked) => setValue("isFeatured", checked, { shouldDirty: true })}
                />
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
                <p className="text-xs text-zinc-500">Comma separated keywords.</p>
              </div>
            </CardContent>
          </Card>

          {/* SEO Section */}
          <Card className="border-white/10 bg-black/50 backdrop-blur">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  SEO Settings
                </p>
                <p className="text-xs text-zinc-500">Optimize your post for search engines</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle" className="text-sm font-semibold text-zinc-100">
                    Meta Title
                  </Label>
                  <Input
                    id="metaTitle"
                    placeholder="SEO title for search results"
                    className="border-zinc-800 bg-black/60"
                    {...register("metaTitle")}
                  />
                  <p className="text-xs text-zinc-500">
                    {metaTitleValue?.length || 0}/60 characters
                  </p>
                  {errors.metaTitle && <p className="text-sm text-red-500">{errors.metaTitle.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription" className="text-sm font-semibold text-zinc-100">
                    Meta Description
                  </Label>
                  <textarea
                    id="metaDescription"
                    placeholder="Brief description for search results"
                    className="w-full rounded-lg border border-zinc-800 bg-black/60 px-3 py-2 text-sm text-zinc-200 min-h-[80px]"
                    {...register("metaDescription")}
                  />
                  <p className="text-xs text-zinc-500">
                    {metaDescriptionValue?.length || 0}/160 characters
                  </p>
                  {errors.metaDescription && <p className="text-sm text-red-500">{errors.metaDescription.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaKeywords" className="text-sm font-semibold text-zinc-100">
                    Meta Keywords
                  </Label>
                  <Input
                    id="metaKeywords"
                    placeholder="seo, keywords, comma, separated"
                    className="border-zinc-800 bg-black/60"
                    {...register("metaKeywords")}
                  />
                  <p className="text-xs text-zinc-500">Comma separated SEO keywords (optional)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-black/50 backdrop-blur">
            <CardContent className="space-y-4 p-6 text-sm text-zinc-400">
              <div className="rounded-xl border border-zinc-800/70 bg-black/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/70">Preview</p>
                <p className="mt-2 text-sm text-zinc-200 line-clamp-3">
                  {contentValue.replace(/<[^>]+>/g, " ").trim() || "Your story preview will appear here once you start editing."}
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
            <Button type="submit" form="blog-edit-form" disabled={isSubmitting} className="px-6">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
