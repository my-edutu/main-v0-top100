"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import InitialPortrait from "./InitialPortrait"

type PortraitImageProps = {
  src?: string
  name: string
  priority?: boolean
  sizes: string
  className?: string
}

export default function PortraitImage({
  src,
  name,
  priority = false,
  sizes,
  className,
}: PortraitImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [src])

  if (!src || failed) return <InitialPortrait name={name} />

  return (
    <Image
      src={src}
      alt={`Portrait of ${name}`}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
