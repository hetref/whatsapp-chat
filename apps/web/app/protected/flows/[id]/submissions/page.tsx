"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ClipboardList, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlowSubmission {
  id: string;
  contactPhone: string;
  contactName: string | null;
  responseData: Record<string, unknown>;
  submittedAt: string;
}

interface SubmissionsResponse {
  flow: { id: string; name: string };
  submissions: FlowSubmission[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

function formatFieldName(name: string) {
  return name.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value);
}

export default function FlowSubmissionsPage() {
  const params = useParams<{ id: string }>();
  const flowId = params.id;
  const [result, setResult] = useState<SubmissionsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/flows/${flowId}/submissions?page=${page}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load Flow submissions.");
      setResult(payload.data as SubmissionsResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Flow submissions.");
    } finally {
      setLoading(false);
    }
  }, [flowId, page]);

  useEffect(() => { void loadSubmissions(); }, [loadSubmissions]);

  return (
    <main className="space-y-6 p-5 md:p-8">
      <Button asChild variant="outline" size="sm">
        <Link href="/protected/flows"><ArrowLeft className="mr-2 size-4" />Back to Flows</Link>
      </Button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#5F7C65]">
            <ClipboardList className="size-4" /> Flow submissions
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{result?.flow.name || "Submissions"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {result ? `${result.pagination.total} submission${result.pagination.total === 1 ? "" : "s"}` : "Responses submitted by people who completed this Flow."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadSubmissions()} disabled={loading}>
          <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />Loading submissions…
        </div>
      ) : error ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <div className="flex-1">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadSubmissions()}>Try again</Button>
          </div>
        </div>
      ) : !result?.submissions.length ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 text-center">
          <div className="mb-4 rounded-full bg-[#5F7C65]/10 p-4 text-[#5F7C65]"><ClipboardList className="size-7" /></div>
          <h2 className="text-lg font-semibold">No submissions yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Completed Flow responses will appear here after WhatsApp sends them to your webhook.
          </p>
        </section>
      ) : (
        <>
          <section className="space-y-4">
            {result.submissions.map((submission) => {
              const fields = Object.entries(submission.responseData).filter(([key]) => key !== "flow_token");
              return (
                <article key={submission.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-2 border-b pb-4 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="font-semibold">{submission.contactName || submission.contactPhone}</h2>
                      {submission.contactName && <p className="mt-0.5 text-sm text-muted-foreground">{submission.contactPhone}</p>}
                    </div>
                    <time className="text-xs text-muted-foreground" dateTime={submission.submittedAt}>
                      {new Date(submission.submittedAt).toLocaleString()}
                    </time>
                  </div>
                  {fields.length ? (
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      {fields.map(([key, value]) => (
                        <div key={key} className="min-w-0">
                          <dt className="text-xs font-medium text-muted-foreground">{formatFieldName(key)}</dt>
                          <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{formatValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">No response fields were included.</p>
                  )}
                </article>
              );
            })}
          </section>

          {result.pagination.totalPages > 1 && (
            <nav aria-label="Submission pages" className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {result.pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= result.pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
