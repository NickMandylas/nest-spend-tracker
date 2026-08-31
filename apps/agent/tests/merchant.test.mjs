import assert from "node:assert/strict"
import test from "node:test"

import { merchantMatches } from "../agent/lib/merchant.ts"

const noRules = new Map()

test("merchant matching uses provider names and statement descriptions", () => {
  assert.equal(
    merchantMatches(
      {
        description: "39832415 COLES 7801 CAMBERWE",
        merchantName: null,
      },
      noRules,
      "Coles"
    ),
    true
  )
  assert.equal(
    merchantMatches(
      {
        description: "VISA PURCHASE 25AUG WOOLWORTHS/752 RIVER MID CAMBE",
        merchantName: "WOOLWORTHS/752 RIVER MID CAMBE",
      },
      noRules,
      "Woolworths"
    ),
    true
  )
})
