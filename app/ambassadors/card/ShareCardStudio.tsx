"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Download, ImagePlus, Loader2, RotateCcw, Share2, ZoomIn } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateImage } from "@/lib/utils/image-processor"
import { AMBASSADOR_FRAME } from "@/lib/share-card/frame"
import {
  IDENTITY_TRANSFORM,
  MAX_SCALE,
  MIN_SCALE,
  type PhotoTransform,
  canvasToBlob,
  clampTransform,
  loadImage,
  renderCard,
  resolveFontFamily,
  toSlug,
} from "@/lib/share-card/render"

const frame = AMBASSADOR_FRAME

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"]

export default function ShareCardStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null)
  const [fontFamily, setFontFamily] = useState("sans-serif")
  const [transform, setTransform] = useState<PhotoTransform>(IDENTITY_TRANSFORM)
  const [name, setName] = useState("")
  const [role, setRole] = useState(frame.defaultRole)
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [canShare, setCanShare] = useState(false)

  // Load the font and (if artwork exists) the frame before the first paint, so
  // the very first render is already correct rather than flashing a fallback.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const family = await resolveFontFamily()
      if (!cancelled) setFontFamily(family)
    })()

    if (frame.src) {
      void loadImage(frame.src)
        .then((img) => {
          if (!cancelled) setFrameImage(img)
        })
        .catch(() => {
          // Placeholder frame renders instead — the studio stays usable.
          if (!cancelled) {
            toast.error("Card artwork could not be loaded. Showing a placeholder.")
          }
        })
    }

    return () => {
      cancelled = true
    }
  }, [])

  // Web Share with files is mobile-only; desktop falls back to download.
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.canShare === "function")
  }, [])

  // Repaint whenever any input changes. Cheap enough to run on every drag frame.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    renderCard(ctx, { frame, photo, transform, name, role, fontFamily, frameImage })
  }, [photo, transform, name, role, fontFamily, frameImage])

  const handleFile = useCallback(async (file: File) => {
    setLoadingPhoto(true)
    try {
      // Generous bounds: the shared util defaults to 1920x1080, which would
      // reject an ordinary phone photo.
      const { isValid, errors } = await validateImage(file, {
        maxSizeInMB: 12,
        maxWidth: 12000,
        maxHeight: 12000,
        minDimension: 400,
        allowedTypes: ACCEPTED,
      })
      if (!isValid) {
        toast.error(errors[0] ?? "That image can't be used.")
        return
      }

      const url = URL.createObjectURL(file)
      try {
        const img = await loadImage(url)
        setPhoto(img)
        setTransform(IDENTITY_TRANSFORM)
      } finally {
        // The decoded image stays valid after revoke; this just frees the blob.
        URL.revokeObjectURL(url)
      }
    } catch {
      toast.error("That image couldn't be read. Try a different file.")
    } finally {
      setLoadingPhoto(false)
    }
  }, [])

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    // Reset so picking the same file twice still fires a change event.
    e.target.value = ""
  }

  /* ---------- pan + zoom ---------- */

  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const pinch = useRef<{ distance: number; scale: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  /** Preview is displayed smaller than the 1080px canvas; scale deltas up. */
  const canvasPerCssPixel = () => {
    const canvas = canvasRef.current
    if (!canvas) return 1
    const rect = canvas.getBoundingClientRect()
    return rect.width ? frame.width / rect.width : 1
  }

  const applyTransform = useCallback(
    (next: PhotoTransform) => {
      if (!photo) return
      setTransform(clampTransform(photo, frame.photo, next))
    },
    [photo],
  )

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: transform.scale }
      drag.current = null
    } else {
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo || !pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current.distance > 0) {
        const ratio = distance / pinch.current.distance
        applyTransform({ ...transform, scale: pinch.current.scale * ratio })
      }
      return
    }

    if (drag.current?.id !== e.pointerId) return
    const k = canvasPerCssPixel()
    const dx = (e.clientX - drag.current.x) * k
    const dy = (e.clientY - drag.current.y) * k
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    applyTransform({
      ...transform,
      offsetX: transform.offsetX + dx,
      offsetY: transform.offsetY + dy,
    })
  }

  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId)
    if (drag.current?.id === e.pointerId) drag.current = null
    if (pointers.current.size < 2) pinch.current = null
  }

  /* ---------- export ---------- */

  const buildFile = async () => {
    const canvas = canvasRef.current
    if (!canvas) throw new Error("Card is not ready yet.")
    const blob = await canvasToBlob(canvas)
    return new File([blob], `top100afl-${toSlug(name)}.png`, { type: "image/png" })
  }

  const onDownload = async () => {
    setExporting(true)
    try {
      const file = await buildFile()
      const url = URL.createObjectURL(file)
      const link = document.createElement("a")
      link.href = url
      link.download = file.name
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Card downloaded.")
    } catch {
      toast.error("Could not save the card. Try again.")
    } finally {
      setExporting(false)
    }
  }

  const onShare = async () => {
    setExporting(true)
    try {
      const file = await buildFile()
      if (!navigator.canShare?.({ files: [file] })) {
        toast.message("Sharing isn't supported here — downloading instead.")
        await onDownload()
        return
      }
      await navigator.share({
        files: [file],
        title: "Top100 Africa Future Leaders",
        text: `${name || "I"} — ${role}`,
      })
    } catch (err) {
      // The user dismissing the share sheet is not an error worth surfacing.
      if ((err as Error)?.name !== "AbortError") {
        toast.error("Could not open the share sheet.")
      }
    } finally {
      setExporting(false)
    }
  }

  const ready = Boolean(photo)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {/* Preview */}
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-[28px] border border-orange-100 bg-white p-3 shadow-sm">
          <canvas
            ref={canvasRef}
            width={frame.width}
            height={frame.height}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            className={`w-full rounded-[20px] ${
              ready ? "cursor-grab touch-none active:cursor-grabbing" : ""
            }`}
            // The canvas is a live preview of the same pixels the download
            // produces; the text below is the accessible equivalent.
            role="img"
            aria-label={
              ready
                ? `Share card preview for ${name || "your name"}, ${role}`
                : "Share card preview. Add a photo to begin."
            }
          />

          {!ready && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-3 flex flex-col items-center justify-center gap-3 rounded-[20px] bg-slate-900/60 text-white backdrop-blur-sm transition hover:bg-slate-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {loadingPhoto ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <ImagePlus className="h-8 w-8" />
              )}
              <span className="text-sm font-semibold">
                {loadingPhoto ? "Reading your photo…" : "Add your photo to start"}
              </span>
            </button>
          )}
        </div>

        {ready && (
          <p className="text-center text-sm text-slate-600">
            Drag the photo to reposition it. Pinch or use the slider to zoom.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-6 rounded-[28px] border border-orange-100 bg-[#fffaf4] p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          onChange={onPick}
          className="sr-only"
        />

        <div className="space-y-2">
          <Label htmlFor="photo-button">Your photo</Label>
          <Button
            id="photo-button"
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingPhoto}
            className="w-full justify-start gap-2"
          >
            {loadingPhoto ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {photo ? "Choose a different photo" : "Upload a photo"}
          </Button>
          <p className="text-xs text-slate-500">
            JPG, PNG or WebP, up to 12MB. Your photo stays on your device — nothing is uploaded.
          </p>
        </div>

        {ready && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="zoom" className="flex items-center gap-2">
                <ZoomIn className="h-4 w-4" /> Zoom
              </Label>
              <button
                type="button"
                onClick={() => setTransform(IDENTITY_TRANSFORM)}
                className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
            <input
              id="zoom"
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.01}
              value={transform.scale}
              onChange={(e) => applyTransform({ ...transform, scale: Number(e.target.value) })}
              className="w-full accent-orange-500"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={name}
            maxLength={40}
            placeholder="Adaobi Okafor"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Your title</Label>
          <Input
            id="role"
            value={role}
            maxLength={44}
            placeholder={frame.defaultRole}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div className="space-y-2 pt-2">
          <Button
            type="button"
            onClick={onDownload}
            disabled={!ready || exporting}
            className="w-full gap-2 bg-gradient-to-r from-orange-500 to-amber-400 text-white hover:from-orange-600 hover:to-amber-500"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download card
          </Button>

          {canShare && (
            <Button
              type="button"
              variant="outline"
              onClick={onShare}
              disabled={!ready || exporting}
              className="w-full gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}

          {!ready && (
            <p className="text-center text-xs text-slate-500">Add a photo to enable download.</p>
          )}
        </div>
      </div>
    </div>
  )
}
