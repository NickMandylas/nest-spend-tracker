import assert from "node:assert/strict"
import test from "node:test"

import { activeFilter } from "../agent/lib/filters.ts"

test("generic all and any selections do not become SQL filters", () => {
  for (const value of [
    undefined,
    "all",
    "All accounts",
    "Any account",
    "all categories",
    "Any category",
    "all statuses",
    "Any status",
  ]) {
    assert.equal(activeFilter(value), null)
  }
})

test("real filter values are preserved and trimmed", () => {
  assert.equal(activeFilter(" Everyday "), "Everyday")
  assert.equal(activeFilter("Food & drink"), "Food & drink")
  assert.equal(activeFilter("posted"), "posted")
})
