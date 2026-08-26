import type * as React from "react"

import { cn } from "@/lib/utils"

const CATEGORY_ICON_PATHS: Record<string, string> = {
  BANK_FEES: "/icons/categories/bank-fees.svg",
  FOOD_AND_DRINK: "/icons/categories/food.svg",
  FOOD_AND_DRINK_GROCERIES: "/icons/categories/groceries.svg",
  GOVERNMENT_AND_NON_PROFIT: "/icons/categories/home-loan.svg",
  INCOME: "/icons/categories/income.svg",
  LOAN_PAYMENTS: "/icons/categories/home-loan.svg",
  MERCHANDISE: "/icons/categories/shopping.svg",
  PERSONAL_CARE: "/icons/categories/personal-care.svg",
  SERVICES: "/icons/categories/services.svg",
  TRANSFER_IN: "/icons/categories/transfer-in.svg",
  TRANSFER_OUT: "/icons/categories/transfer-out.svg",
  UNCATEGORISED: "/icons/categories/uncategorised.svg",
}

export function IconlyCategoryIcon({
  category,
  className,
}: {
  category?: string | null
  className?: string
}) {
  const iconPath =
    CATEGORY_ICON_PATHS[category ?? "UNCATEGORISED"] ??
    CATEGORY_ICON_PATHS.UNCATEGORISED
  const maskStyles: React.CSSProperties = {
    maskImage: `url("${iconPath}")`,
    maskPosition: "center",
    maskRepeat: "no-repeat",
    maskSize: "contain",
    WebkitMaskImage: `url("${iconPath}")`,
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
  }

  return (
    <span
      className={cn("inline-block size-[1.125rem] bg-current", className)}
      style={maskStyles}
      aria-hidden="true"
    />
  )
}
