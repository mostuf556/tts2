import { createFileRoute } from "@tanstack/react-router";
import { hasSupabaseAdminConfig } from "@/lib/openrouter-pool.server";
import { requireSupabaseUser, UserAuthError } from "@/lib/user-account.server";

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Authorization",
};

const SECRET_ENV_NAMES = [
  "SESSION_SECRET",
  "OPENROUTER_API_KEY",
  "OPENROUTER_API_KEYS",
  "LOVABLE_API_KEY",
  "LOVABLE_API_KEYS",
  "GEMINI_API_KEY",
  "GEMINI_API_KEYS",
  "OPENAI_API_KEY",
  "OPENAI_API_KEYS",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_API_KEYS",
  "DEEPGRAM_API_KEY",
  "DEEPGRAM_API_KEYS",
  "OPENROUTER_KEY_ENCRYPTION_SECRET",
  "PROVIDER_MANAGEMENT_TOKEN",
  "OPENROUTER_MANAGEMENT_TOKEN",
  "LOVABLE_CRON_SECRET",
  "LOVABLE_CRON_SECRET_PREVIOUS",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export const Route = createFileRoute("/api/user/env")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasSupabaseAdminConfig()) {
          return Response.json(
            { error: "Environment status requires Supabase authentication." },
            { status: 503, headers: NO_STORE },
          );
        }

        try {
          await requireSupabaseUser(request);
          const variables = SECRET_ENV_NAMES.map((name) => ({
            name,
            configured: Boolean(process.env[name]),
          }));
          return Response.json({ variables }, { headers: NO_STORE });
        } catch (error) {
          const status = error instanceof UserAuthError ? 401 : 500;
          return Response.json(
            {
              error:
                status === 401
                  ? "Authentication required."
                  : "Could not load environment status.",
            },
            { status, headers: NO_STORE },
          );
        }
      },
    },
  },
});
