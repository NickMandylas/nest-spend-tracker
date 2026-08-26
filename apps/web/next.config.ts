import type { NextConfig } from "next"
import { withEve } from "eve/next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.bankofmelbourne.com.au",
        pathname: "/content/dam/bom/images/**",
      },
    ],
  },
  serverExternalPackages: ["better-sqlite3"],
}

export default withEve(nextConfig, {
  eveRoot: "../agent",
})
