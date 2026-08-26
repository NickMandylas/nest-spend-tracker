import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.SPEND_TRACKER_DB_PATH ?? "../../data/spend-tracker.sqlite",
  },
})
