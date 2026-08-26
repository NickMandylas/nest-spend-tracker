import { getMerchantLogoRule } from "@/lib/merchant-logo-rules"

const DATA_IMAGE_PATTERN =
  /^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,([a-zA-Z0-9+/=]+)$/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params
  if (!ruleId || ruleId.length > 80) {
    return new Response("Not found", { status: 404 })
  }

  const rule = getMerchantLogoRule(ruleId)
  if (!rule?.logo) return new Response("Not found", { status: 404 })

  const dataImage = rule.logo.match(DATA_IMAGE_PATTERN)
  if (dataImage) {
    return new Response(Buffer.from(dataImage[2], "base64"), {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": dataImage[1],
        "X-Content-Type-Options": "nosniff",
      },
    })
  }

  try {
    const logoUrl = new URL(rule.logo)
    if (logoUrl.protocol !== "https:" && logoUrl.protocol !== "http:") {
      throw new Error("Unsupported logo URL")
    }
    return Response.redirect(logoUrl, 307)
  } catch {
    return new Response("Invalid logo", { status: 422 })
  }
}
