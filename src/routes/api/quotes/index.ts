import { createFileRoute } from "@tanstack/react-router";
import { quoteInputSchema, createQuote } from "@/lib/quotes.server";

function publicOrigin(request: Request) {
  const configured = process.env["PUBLIC_BASE_URL"]?.trim();
  if (configured) return new URL(configured).origin;
  const replitDomain = process.env["REPLIT_DEV_DOMAIN"]?.trim();
  if (replitDomain) return `https://${replitDomain}`;
  if (process.env["NODE_ENV"] !== "production") return new URL(request.url).origin;
  throw new Error("PUBLIC_BASE_URL is not configured");
}

export const Route = createFileRoute("/api/quotes/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = quoteInputSchema.safeParse(await request.json());
          if (!parsed.success)
            return Response.json(
              { error: parsed.error.issues[0]?.message ?? "Invalid quote selection" },
              { status: 400 },
            );
          return Response.json(await createQuote(parsed.data, publicOrigin(request)), {
            status: 201,
          });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Invalid request" },
            { status: 400 },
          );
        }
      },
    },
  },
});
