"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FLOW_CATEGORIES, createDefaultFlowConfig } from "@/lib/flows/flow-types";

const categoryLabels: Record<string, string> = {
  OTHER: "Other",
  SIGN_UP: "Sign up",
  SIGN_IN: "Sign in",
  APPOINTMENT_BOOKING: "Appointment booking",
  LEAD_GENERATION: "Lead generation",
  CONTACT_US: "Contact us",
  CUSTOMER_SUPPORT: "Customer support",
  SURVEY: "Survey",
};

export default function NewFlowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          screenConfig: createDefaultFlowConfig(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create the Flow.");
      router.push(`/protected/flows/${result.data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the Flow.");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-5 md:p-8">
      <Link href="/protected/flows" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Flows
      </Link>
      <div>
        <p className="text-sm font-medium text-[#5F7C65]">Static WhatsApp Flow</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Create a Flow</h1>
        <p className="mt-2 text-sm text-muted-foreground">Start with a draft. You can add screens and build the experience next.</p>
      </div>
      <form onSubmit={createDraft} className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm md:p-7">
        <label className="block space-y-2 text-sm font-medium">
          Flow name
          <Input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Appointment request" />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
          <Textarea maxLength={512} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will this Flow help customers do?" />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Category
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
            {FLOW_CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild><Link href="/protected/flows">Cancel</Link></Button>
          <Button type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
            Create draft
          </Button>
        </div>
      </form>
    </main>
  );
}
