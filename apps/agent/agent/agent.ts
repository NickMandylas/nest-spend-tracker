import { defineAgent } from "eve"

export default defineAgent({
  model: "openai/gpt-5.6-luna",
  reasoning: "none",
  build: {
    externalDependencies: ["better-sqlite3"],
  },
})
