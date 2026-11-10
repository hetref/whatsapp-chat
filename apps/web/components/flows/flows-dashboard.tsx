"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Copy, FilePlus2, GitBranch, LoaderCircle, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toaster, toast } from "@/components/ui/toast";
import type { StoredFlow } from "@/lib/flows/flow-types";

const statusNames: Record<StoredFlow["status"], string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  DEPRECATED: "Deprecated",
};

const statusColors: Record<StoredFlow["status"], string> = {
  DRAFT: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  PUBLISHED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  DEPRECATED: "border-stone-500/30 bg-stone-500/10 text-stone-600 dark:text-stone-300",
};

export default function FlowsDashboard() {
  const router = useRouter();
  const [flows, setFlows] = useState<StoredFlow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");

  const loadFlows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/flows", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load Flows.");
      setFlows(result.data as StoredFlow[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Flows.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadFlows(); }, [loadFlows]);

  const visibleFlows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return flows.filter((flow) => {
      const matchesStatus = statusFilter === "ALL" || flow.status === statusFilter;
      const matchesSearch = !query ||
        flow.name.toLowerCase().includes(query) ||
        (flow.description || "").toLowerCase().includes(query) ||
        flow.category.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [flows, search, statusFilter]);

  async function duplicateFlow(flow: StoredFlow) {
    setWorkingId(flow.id);
    try {
      const response = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${flow.name} copy`.slice(0, 60),
          description: flow.description,
          category: flow.category,
          screenConfig: flow.screenConfig,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not duplicate Flow.");
      toast("Flow duplicated as a draft.", "success");
      await loadFlows();
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not duplicate Flow.", "error");
    } finally {
      setWorkingId("");
    }
  }

  async function removeFlow(flow: StoredFlow) {
    if (!window.confirm(`Delete "${flow.name}"? This cannot be undone.`)) return;
    setWorkingId(flow.id);
    try {
      const response = await fetch(`/api/flows/${flow.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete Flow.");
      setFlows((current) => current.filter((item) => item.id !== flow.id));
      toast("Flow deleted.", "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not delete Flow.", "error");
    } finally {
      setWorkingId("");
    }
  }

  return (
    <main className="space-y-6 p-5 md:p-8">
      <Toaster />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#5F7C65]"><GitBranch className="size-4" /> WhatsApp Flows</div>
          <h1 className="text-3xl font-semibold tracking-tight">Flows</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create and manage static WhatsApp Flows for your business.</p>
        </div>
        <Button asChild><Link href="/protected/flows/new"><FilePlus2 className="mr-2 size-4" />Create New Flow</Link></Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search flows by name, description, or category" aria-label="Search flows" />
        </div>
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="DEPRECATED">Deprecated</option>
        </select>
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Loading your Flows…</div>
      ) : error ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-4 text-destructive" />
          <div className="flex-1"><p>{error}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void loadFlows()}>Try again</Button></div>
        </div>
      ) : flows.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 text-center">
          <div className="mb-4 rounded-full bg-[#5F7C65]/10 p-4 text-[#5F7C65]"><GitBranch className="size-7" /></div>
          <h2 className="text-lg font-semibold">Create your first Flow</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">Build a structured WhatsApp experience with screens and form components.</p>
          <Button asChild className="mt-5"><Link href="/protected/flows/new"><FilePlus2 className="mr-2 size-4" />Create New Flow</Link></Button>
        </div>
      ) : visibleFlows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No Flows match these filters.</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleFlows.map((flow) => (
            <article key={flow.id} className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/protected/flows/${flow.id}`} className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold hover:underline">{flow.name}</h2>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{flow.description || "No description"}</p>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusColors[flow.status]}>{statusNames[flow.status]}</Badge>
                  <details className="relative">
                    <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-md hover:bg-muted" aria-label={`Actions for ${flow.name}`}><MoreHorizontal className="size-4" /></summary>
                    <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border bg-popover p-1 shadow-lg">
                      <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50" disabled={workingId === flow.id} onClick={() => void duplicateFlow(flow)}><Copy className="size-4" />Duplicate</button>
                      <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={workingId === flow.id} onClick={() => void removeFlow(flow)}><Trash2 className="size-4" />Delete</button>
                    </div>
                  </details>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
                <div className="flex flex-col gap-0.5">
                  <span>{flow.category.replaceAll("_", " ")}</span>
                  {flow.metaFlowId && (
                    <span className="font-mono text-[11px] text-[#5F7C65]">Meta Flow ID: {flow.metaFlowId}</span>
                  )}
                </div>
                <span>Updated {new Date(flow.updatedAt).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/protected/flows/${flow.id}/submissions`)}>Submissions</Button>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/protected/flows/${flow.id}`)}>Edit flow</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
