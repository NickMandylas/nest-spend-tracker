import "server-only"

import { mkdirSync } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"
import Database from "better-sqlite3"
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"

import * as schema from "@/lib/db/schema"

let database: BetterSQLite3Database<typeof schema> | null = null

function databasePath() {
  const configured = process.env.SPEND_TRACKER_DB_PATH
  if (!configured) {
    return join(
      /* turbopackIgnore: true */ process.cwd(),
      "..",
      "..",
      "data",
      "spend-tracker.sqlite"
    )
  }
  return isAbsolute(configured)
    ? configured
    : join(/* turbopackIgnore: true */ process.cwd(), configured)
}

export function getDatabase() {
  if (database) return database

  const path = databasePath()
  mkdirSync(dirname(path), { recursive: true })

  const sqlite = new Database(path)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  database = drizzle(sqlite, { schema })

  return database
}
