import { DM_Sans, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"
import Script from "next/script"

import "./globals.css"
import { FinanceChatProvider } from "@/components/finance-chat-provider"
import { ThemeProvider } from "@/components/theme-provider"
import {
  FINANCE_CHAT_COOKIE_NAME,
  readFinanceChatOpenPreference,
} from "@/lib/finance-chat-preferences"
import { cn } from "@/lib/utils"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const defaultChatOpen = readFinanceChatOpenPreference(
    cookieStore.get(FINANCE_CHAT_COOKIE_NAME)?.value
  )

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        dmSans.variable,
        fontMono.variable
      )}
    >
      <body>
        <Script id="disable-openui-devtools" strategy="beforeInteractive">
          {`globalThis[Symbol.for("openui.devtools.autoMount")] = true;`}
        </Script>
        <ThemeProvider>
          <FinanceChatProvider defaultOpen={defaultChatOpen}>
            {children}
          </FinanceChatProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
