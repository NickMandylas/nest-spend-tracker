const UNFILTERED_SELECTIONS = new Set([
  "all",
  "any",
  "all account types",
  "all accounts",
  "any account",
  "any accounts",
  "all categories",
  "any category",
  "all statuses",
  "any status",
])

export function activeFilter(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || UNFILTERED_SELECTIONS.has(trimmed.toLowerCase())) return null
  return trimmed
}
