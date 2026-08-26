"use client"

import * as React from "react"
import Image from "next/image"

import { IconlyCategoryIcon } from "@/components/iconly-category-icon"
import { cn } from "@/lib/utils"

type MerchantLogoProps = {
  name: string
  category?: string | null
  src?: string | null
  className?: string
}

const CATEGORY_STYLES: Record<string, string> = {
  BANK_FEES: "bg-red-500/10 text-red-700 dark:text-red-300",
  FOOD_AND_DRINK: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  FOOD_AND_DRINK_GROCERIES:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  GOVERNMENT_AND_NON_PROFIT:
    "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  INCOME: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  LOAN_PAYMENTS: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  MERCHANDISE: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  PERSONAL_CARE: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  SERVICES: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  TRANSFER_IN: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  TRANSFER_OUT: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  UNCATEGORISED: "bg-foreground/[0.055] text-muted-foreground",
}

function categoryStyle(category?: string | null) {
  return (
    CATEGORY_STYLES[category ?? "UNCATEGORISED"] ??
    CATEGORY_STYLES.UNCATEGORISED
  )
}

function BrandMark({ name }: { name: string }) {
  if (/woolworths/i.test(name)) {
    return (
      <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
        <path
          d="M7.6 12.1c1.4-4.2 5-6.7 9.5-6.7 4.1 0 7.1 1.7 8.8 4.7-2.3-.6-4.5-.1-6.1 1.6-1.8 1.9-2.4 5.2-3.9 8.9-1.1-3.8-2.7-7-4.7-8.4-1.1-.8-2.3-1-3.6-.1Z"
          fill="#65b32e"
        />
        <path
          d="M5.2 13.7c3.5-.6 6.2 1.6 7.7 4.7.9 1.8 1.6 4.1 2.4 6.6-5.7-.3-9.7-4.2-10.1-11.3Z"
          fill="#168742"
        />
        <path
          d="M17.2 25c1-3.4 2.2-6.4 3.9-8.4 1.5-1.8 3.3-2.6 5.6-2.4-.6 6.2-4.1 9.9-9.5 10.8Z"
          fill="#168742"
        />
      </svg>
    )
  }

  if (/\bcoles\b/i.test(name)) {
    return (
      <span className="text-[0.55rem] leading-none font-black tracking-[-0.06em] text-[#e31b23] italic">
        coles
      </span>
    )
  }

  if (/\bkmart\b/i.test(name)) {
    return (
      <span className="text-[0.55rem] leading-none font-black tracking-[-0.08em] text-[#1d4f91]">
        <span className="text-[#e2231a]">K</span>mart
      </span>
    )
  }

  if (/\buber(?:\s*eats)?\b/i.test(name)) {
    return (
      <span className="text-[0.56rem] font-black text-black dark:text-white">
        UBER
      </span>
    )
  }

  if (/\bamazon\b/i.test(name)) {
    return (
      <span className="text-sm leading-none font-black text-[#111827] dark:text-white">
        a
      </span>
    )
  }

  if (/\bnetflix\b/i.test(name)) {
    return (
      <span className="text-sm leading-none font-black text-[#e50914]">N</span>
    )
  }

  if (/\bspotify\b/i.test(name)) {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-[#1ed760] text-[0.55rem] font-black text-black">
        S
      </span>
    )
  }

  if (/\bbunnings\b/i.test(name)) {
    return (
      <span className="text-[0.48rem] leading-none font-black tracking-tight text-[#d71920]">
        BUNNINGS
      </span>
    )
  }

  return null
}

export function MerchantLogo({
  name,
  category,
  src,
  className,
}: MerchantLogoProps) {
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
  const useCustomLogo = Boolean(src && failedSrc !== src)
  const brandMark = <BrandMark name={name} />
  const isKnownBrand =
    /woolworths|\bcoles\b|\bkmart\b|\buber(?:\s*eats)?\b|\bamazon\b|\bnetflix\b|\bspotify\b|\bbunnings\b/i.test(
      name
    )

  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-black/6 font-semibold ring-1 ring-black/[0.025] dark:border-white/10",
        (useCustomLogo || isKnownBrand) && "bg-white dark:bg-white/95",
        !useCustomLogo && !isKnownBrand && categoryStyle(category),
        className
      )}
      role="img"
      aria-label={
        useCustomLogo || isKnownBrand
          ? `${name} logo`
          : `${name} category icon`
      }
      title={name}
    >
      {useCustomLogo ? (
        <Image
          src={src!}
          alt=""
          width={64}
          height={64}
          unoptimized
          onError={() => setFailedSrc(src ?? null)}
          className="size-full object-contain p-0.5"
        />
      ) : isKnownBrand ? (
        brandMark
      ) : (
        <IconlyCategoryIcon category={category} />
      )}
    </span>
  )
}
