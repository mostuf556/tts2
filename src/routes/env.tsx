import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type SecretStatus = {
  name: string;
  configured: boolean;
};

export const Route = createFileRoute("/env")({
  head: () => ({
    meta: [
      { title: "Environment status — Speak API" },
      {
        name: "description",
        content: "Review whether approved application secrets are configured.",
      },
    ],
  }),
  component: EnvironmentStatus,
});

function EnvironmentStatus() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authUnavailable, setAuthUnavailable] = useState("");
  const [variables, setVariables] = useState<SecretStatus[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (active) setSession(nextSession);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void supabase.auth
        .getSession()
        .then(({ data: sessionData }) => {
          if (active) {
            setSession(sessionData.session);
            setLoadingSession(false);
          }
        })
        .catch((reason: unknown) => {
          if (active) {
            setError(reason instanceof Error ? reason.message : String(reason));
            setLoadingSession(false);
          }
        });
    } catch (reason) {
      setAuthUnavailable(reason instanceof Error ? reason.message : String(reason));
      setLoadingSession(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setVariables([]);
      setLoadingData(false);
      setError("");
      return;
    }

    let active = true;
    setLoadingData(true);
    setError("");

    void fetch("/api/user/env", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          variables?: SecretStatus[];
          error?: string;
        };
        if (!response.ok) throw new Error(body.error || "Could not load environment status.");
        if (!Array.isArray(body.variables)) throw new Error("Invalid environment status response.");
        if (active) setVariables(body.variables);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, [session?.access_token]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-foreground">
      <nav className="flex gap-4 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Back to speech
        </Link>
        <Link to="/account" className="hover:text-foreground">
          Account and keys
        </Link>
      </nav>

      <h1 className="mt-5 text-2xl font-semibold">Environment status</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Secret values are never shown. This page reports only whether approved application secrets
        are configured; platform and runtime variables are not listed.
      </p>

      {loadingSession ? (
        <p className="mt-6 text-sm text-muted-foreground">Checking account…</p>
      ) : authUnavailable ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          Environment status requires Supabase authentication.
        </p>
      ) : !session ? (
        <section className="mt-6 border border-border p-4">
          <p className="text-sm">Sign in to review configured secret status.</p>
          <Button asChild className="mt-3">
            <Link to="/account">Sign in</Link>
          </Button>
        </section>
      ) : loadingData ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading status…</p>
      ) : error ? (
        <p role="alert" className="mt-6 border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {variables.map((variable) => (
            <li
              key={variable.name}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <code>{variable.name}</code>
              <span
                className={
                  variable.configured
                    ? "text-green-700 dark:text-green-400"
                    : "text-muted-foreground"
                }
              >
                {variable.configured ? "Configured" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
