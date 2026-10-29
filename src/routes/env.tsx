import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
  const [variables, setVariables] = useState<SecretStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/public/env", { cache: "no-store" })
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
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
        This page is public. It shows only an allowlist of application secret names and whether
        each is configured. Secret values and suffixes are never shown; platform and runtime
        variables are not listed.
      </p>

      {loading ? (
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
