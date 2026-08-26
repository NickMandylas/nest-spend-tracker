"use client"

import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

export function InstitutionLogo({
  name,
  src,
  className,
}: {
  name: string
  src: string | null
  className?: string
}) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
  const useFallback = !src || failedSrc === src

  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-black/10 bg-white",
        className
      )}
    >
      <Image
        src={useFallback ? "/brands/bank-of-melbourne.svg" : src}
        alt={`${name} logo`}
        width={72}
        height={72}
        unoptimized
        onError={() => {
          if (src) setFailedSrc(src)
        }}
        className="size-full scale-[1.18] object-contain"
      />
    </span>
  )
}
