"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Braces,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileJson2,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster, toast } from "@/components/ui/toast";
import FlowPreview from "@/components/flows/flow-preview";
import { generateFlowJson, validateFlowConfig } from "@/lib/flows/flow-json";
import {
  createFlowComponent,
  createId,
  createNextFlowOption,
  FLOW_CATEGORIES,
  isChoiceType,
  screenIdFromTitle,
  type FlowBuilderConfig,
  type FlowCategory,
  type FlowComponent,
  type FlowComponentType,
  type FlowOption,
  type FlowScreen,
  type FlowStatus,
  type StoredFlow,
} from "@/lib/flows/flow-types";

type CenterTab = "editor" | "preview" | "json";

const categoryLabels: Record<FlowCategory, string> = {
  OTHER: "Other",
  SIGN_UP: "Sign up",
  SIGN_IN: "Sign in",
  APPOINTMENT_BOOKING: "Appointment booking",
  LEAD_GENERATION: "Lead generation",
  CONTACT_US: "Contact us",
  CUSTOMER_SUPPORT: "Customer support",
  SURVEY: "Survey",
};

const componentLabels: Record<FlowComponentType, string> = {
  TextHeading: "Text Heading",
  TextBody: "Text Body",
  TextInput: "Text Input",
  TextArea: "Text Area",
  RadioButtonsGroup: "Radio Buttons Group",
  CheckboxGroup: "Checkbox Group",
  Dropdown: "Dropdown",
  DatePicker: "Date Picker",
  OptIn: "Opt-in",
};

const componentGroups: Array<{ label: string; types: FlowComponentType[] }> = [
  { label: "Text", types: ["TextHeading", "TextBody"] },
  { label: "Inputs", types: ["TextInput", "TextArea", "DatePicker", "OptIn"] },
  { label: "Choices", types: ["RadioButtonsGroup", "CheckboxGroup", "Dropdown"] },
];

export default function FlowBuilder({ flowId }: { flowId: string }) {
  const [flow, setFlow] = useState<StoredFlow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FlowCategory>("OTHER");
  const [status, setStatus] = useState<FlowStatus>("DRAFT");
  const [config, setConfig] = useState<FlowBuilderConfig>({ screens: [] });
  const [screenId, setScreenId] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [activeTab, setActiveTab] = useState<CenterTab>("editor");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState("");

  const isPublishedToMeta = Boolean(flow?.metaFlowId && status === "PUBLISHED");
  const currentScreen = config.screens.find((screen) => screen.id === screenId) ?? config.screens[0];
  const selectedComponent = currentScreen?.components.find((component) => component.id === selectedComponentId);
  const validationErrors = useMemo(() => validateFlowConfig(config, category), [config, category]);
  const flowJson = useMemo(() => generateFlowJson(config), [config]);

  const loadFlow = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/flows/${flowId}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load this Flow.");
      const record = result.data as StoredFlow;
      setFlow(record);
      setName(record.name);
      setDescription(record.description || "");
      setCategory(record.category);
      setStatus(record.status);
      setConfig(record.screenConfig);
      setScreenId(record.screenConfig.screens[0]?.id ?? "");
      setDirty(false);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "Could not load this Flow.");
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => { void loadFlow(); }, [loadFlow]);

  function markDirty() {
    setDirty(true);
  }

  function updateConfig(next: FlowBuilderConfig) {
    setConfig(next);
    markDirty();
  }

  function updateScreen(id: string, patch: Partial<FlowScreen>) {
    updateConfig({
      screens: config.screens.map((screen) => screen.id === id ? { ...screen, ...patch } : screen),
    });
  }

  function updateComponent(id: string, patch: Partial<FlowComponent>) {
    if (!currentScreen) return;
    updateScreen(currentScreen.id, {
      components: currentScreen.components.map((component) =>
        component.id === id ? { ...component, ...patch } : component,
      ),
    });
  }

  function addComponent(type: FlowComponentType) {
    if (!currentScreen) return;
    if (currentScreen.components.length >= 49) {
      toast("A screen can contain at most 49 content components.", "warning");
      return;
    }
    let component = createFlowComponent(type, currentScreen.components.length + 1);
    if (component.name) {
      const names = new Set(currentScreen.components.map((item) => item.name));
      let suffix = currentScreen.components.length + 1;
      while (names.has(component.name)) {
        suffix += 1;
        component = { ...component, name: `${component.name.replace(/_\d+$/, "")}_${suffix}` };
      }
    }
    updateScreen(currentScreen.id, { components: [...currentScreen.components, component] });
    setSelectedComponentId(component.id);
  }

  function moveComponent(componentId: string, direction: -1 | 1) {
    if (!currentScreen) return;
    const index = currentScreen.components.findIndex((component) => component.id === componentId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= currentScreen.components.length) return;
    const components = [...currentScreen.components];
    [components[index], components[target]] = [components[target], components[index]];
    updateScreen(currentScreen.id, { components });
  }

  function deleteComponent(componentId: string) {
    if (!currentScreen) return;
    updateScreen(currentScreen.id, {
      components: currentScreen.components.filter((component) => component.id !== componentId),
    });
    if (selectedComponentId === componentId) setSelectedComponentId("");
  }

  function resequence(screens: FlowScreen[]): FlowScreen[] {
    return screens.map((screen, index) => ({
      ...screen,
      terminal: index === screens.length - 1,
      nextScreenId: index === screens.length - 1 ? null : screens[index + 1].id,
    }));
  }

  function addScreen() {
    if (config.screens.length >= 10) {
      toast("A Flow can contain at most 10 screens.", "warning");
      return;
    }
    const title = `Screen ${config.screens.length + 1}`;
    const newScreen: FlowScreen = {
      id: screenIdFromTitle(title, config.screens.map((screen) => screen.id)),
      title,
      components: [],
      nextScreenId: null,
      terminal: true,
    };
    const screens = resequence([...config.screens, newScreen]);
    updateConfig({ screens });
    setScreenId(newScreen.id);
    setSelectedComponentId("");
  }

  function duplicateScreen(id: string) {
    if (config.screens.length >= 10) {
      toast("A Flow can contain at most 10 screens.", "warning");
      return;
    }
    const original = config.screens.find((screen) => screen.id === id);
    if (!original) return;
    const title = `${original.title} copy`.slice(0, 20);
    const duplicate: FlowScreen = {
      ...original,
      id: screenIdFromTitle(title, config.screens.map((screen) => screen.id)),
      title,
      components: original.components.map((component) => ({ ...component, id: createId() })),
    };
    const screens = resequence([...config.screens, duplicate]);
    updateConfig({ screens });
    setScreenId(duplicate.id);
    setSelectedComponentId("");
  }

  function deleteScreen(id: string) {
    if (config.screens.length <= 1) {
      toast("A Flow must contain at least one screen.", "warning");
      return;
    }
    const next = resequence(config.screens.filter((screen) => screen.id !== id));
    updateConfig({ screens: next });
    if (screenId === id) setScreenId(next[0].id);
    setSelectedComponentId("");
  }

  function moveScreen(id: string, direction: -1 | 1) {
    const index = config.screens.findIndex((screen) => screen.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= config.screens.length) return;
    const screens = [...config.screens];
    [screens[index], screens[target]] = [screens[target], screens[index]];
    updateConfig({ screens: resequence(screens) });
  }

  function setFinalScreen(id: string) {
    const screen = config.screens.find((item) => item.id === id);
    if (!screen) return;
    updateConfig({ screens: resequence([...config.screens.filter((item) => item.id !== id), screen]) });
    setScreenId(id);
  }

  async function save(nextStatus = status) {
    if (isPublishedToMeta) {
      toast("Meta-published Flows cannot be edited. Duplicate this Flow to make changes.", "error");
      return;
    }
    if (validationErrors.length) {
      setActiveTab("editor");
      toast(`Fix the ${validationErrors.length} validation ${validationErrors.length === 1 ? "error" : "errors"} listed above before saving.`, "error");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/flows/${flowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, status: nextStatus, screenConfig: config }),
      });
      const result = await response.json();
      if (!response.ok) {
        const detail = Array.isArray(result.details) ? ` ${result.details.join(" ")}` : "";
        throw new Error(`${result.error || "Could not save this Flow."}${detail}`);
      }
      setFlow(result.data as StoredFlow);
      setStatus(nextStatus);
      setDirty(false);
      toast(nextStatus === "PUBLISHED" ? "Flow status updated." : "Flow saved.", "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not save this Flow.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function publishToMeta() {
    if (validationErrors.length) {
      setActiveTab("editor");
      toast(`Fix the ${validationErrors.length} validation ${validationErrors.length === 1 ? "error" : "errors"} listed above before publishing.`, "error");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/flows/${flowId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, screenConfig: config }),
      });
      const result = await response.json();
      if (!response.ok) {
        const details = Array.isArray(result.details)
          ? ` ${result.details.map((item: unknown) =>
              typeof item === "object" && item !== null && "message" in item &&
              typeof item.message === "string" ? item.message : JSON.stringify(item),
            ).join(" ")}`
          : "";
        throw new Error(`${result.error || "Could not publish this Flow to Meta."}${details}`);
      }

      const publishedFlow = result.data as StoredFlow;
      setFlow(publishedFlow);
      setName(publishedFlow.name);
      setDescription(publishedFlow.description || "");
      setCategory(publishedFlow.category);
      setStatus(publishedFlow.status);
      setConfig(publishedFlow.screenConfig);
      setDirty(false);
      toast(`Flow published to Meta WhatsApp Manager. Meta Flow ID: ${publishedFlow.metaFlowId}`, "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not publish this Flow to Meta.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(flowJson, null, 2));
      toast("Flow JSON copied to clipboard.", "success");
    } catch {
      toast("Could not access the clipboard. Select and copy the JSON instead.", "error");
    }
  }

  function exportJson() {
    const file = new Blob([JSON.stringify(flowJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name.trim().replace(/[^a-z0-9_-]+/gi, "_") || "whatsapp-flow"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Loading Flow…</div>;
  }
  if (loadError || !flow) {
    return (
      <main className="p-6">
        <div role="alert" className="mx-auto max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
          <p>{loadError || "Flow not found."}</p>
          <Button className="mt-4" variant="outline" asChild><Link href="/protected/flows">Back to Flows</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 md:p-6">
      <Toaster />
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Back to Flows" asChild><Link href="/protected/flows"><ArrowLeft className="size-4" /></Link></Button>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Static WhatsApp Flow</p>
              <h1 className="truncate text-xl font-semibold">{name || flow.name}</h1>
            </div>
            <Badge variant="outline">{status[0] + status.slice(1).toLowerCase()}</Badge>
            {dirty && <span className="text-xs text-amber-700 dark:text-amber-300">Unsaved changes</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void save(status)} disabled={saving || isPublishedToMeta || validationErrors.length > 0} title={isPublishedToMeta ? "Meta-published Flows cannot be edited" : validationErrors.length ? "Fix validation errors before saving" : "Save changes"}>
              {saving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save
            </Button>
            {isPublishedToMeta ? (
              <Button variant="outline" disabled title={`Meta Flow ID: ${flow?.metaFlowId}`}>
                <Check className="mr-2 size-4" />Published to Meta
              </Button>
            ) : (
              <Button onClick={() => void publishToMeta()} disabled={saving || validationErrors.length > 0} title={validationErrors.length ? "Fix validation errors before publishing" : "Upload and publish this Flow to Meta"}>
                {saving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                Publish to Meta
              </Button>
            )}
            <details className="relative">
              <summary className="flex h-8 cursor-pointer list-none items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted"><ChevronDown className="size-4" />More</summary>
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border bg-popover p-1 shadow-lg">
                {!isPublishedToMeta && status !== "DEPRECATED" && <button className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => void save("DEPRECATED")}>Mark deprecated</button>}
                {!isPublishedToMeta && <button className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => void save("DRAFT")}>Mark as draft</button>}
              </div>
            </details>
          </div>
        </div>
        {isPublishedToMeta && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-muted-foreground">
            This Flow is published in Meta and cannot be edited there. Meta Flow ID: {flow.metaFlowId}. To make changes, duplicate it and publish the copy.
          </p>
        )}
        <div className="grid gap-3 rounded-xl border bg-card p-3 md:grid-cols-[minmax(180px,1fr)_minmax(220px,2fr)_190px]">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">Flow name
            <Input value={name} maxLength={60} onChange={(event) => { setName(event.target.value); markDirty(); }} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">Description
            <Input value={description} maxLength={512} onChange={(event) => { setDescription(event.target.value); markDirty(); }} placeholder="Optional description" />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">Category
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={category} onChange={(event) => { setCategory(event.target.value as FlowCategory); markDirty(); }}>
              {FLOW_CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}
            </select>
          </label>
        </div>
      </header>

      {validationErrors.length > 0 && (
        <section role="alert" aria-live="polite" className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Fix these items before saving</h2>
            <span className="text-xs text-muted-foreground">{validationErrors.length} {validationErrors.length === 1 ? "issue" : "issues"}</span>
          </div>
          <ul className="mt-2 grid max-h-36 gap-x-6 gap-y-1 overflow-y-auto text-sm text-muted-foreground md:grid-cols-2">
            {validationErrors.map((error) => <li key={error} className="list-inside list-disc">{error}</li>)}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-card p-3">
        <h2 className="mb-3 text-sm font-semibold">Add a component</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
            {componentGroups.map((group) => (
              <div key={group.label} className="min-w-0">
                <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
                <div className="flex flex-wrap gap-1">
                  {group.types.map((type) => (
                    <button key={type} onClick={() => addComponent(type)} className="inline-flex items-center gap-1.5 rounded-md border border-border/70 px-2 py-1.5 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50" disabled={!currentScreen || currentScreen.components.length >= 49}>
                      <Plus className="size-3.5 text-[#5F7C65]" />{componentLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </section>

      <div className="grid min-h-[650px] gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
            <div className="flex gap-1">
              <TabButton active={activeTab === "editor"} onClick={() => setActiveTab("editor")} icon={<Braces className="size-4" />}>Editor</TabButton>
              <TabButton active={activeTab === "preview"} onClick={() => setActiveTab("preview")} icon={<Eye className="size-4" />}>Preview</TabButton>
              <TabButton active={activeTab === "json"} onClick={() => setActiveTab("json")} icon={<FileJson2 className="size-4" />}>JSON</TabButton>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => void copyJson()}><Copy className="mr-1.5 size-3.5" />Copy JSON</Button>
              <Button size="sm" variant="outline" onClick={exportJson}><Download className="mr-1.5 size-3.5" />Export</Button>
            </div>
          </div>

          {activeTab === "editor" && currentScreen && (
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Screen editor</p>
                  <h2 className="text-lg font-semibold">{currentScreen.title}</h2>
                </div>
                <Button size="sm" variant="outline" onClick={addScreen} disabled={config.screens.length >= 10}><Plus className="mr-1.5 size-4" />Add screen</Button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {config.screens.map((screen, index) => (
                  <button key={screen.id} onClick={() => { setScreenId(screen.id); setSelectedComponentId(""); }} className={`min-w-32 rounded-lg border p-2 text-left ${screen.id === currentScreen.id ? "border-[#5F7C65] bg-[#5F7C65]/10" : "hover:bg-muted"}`}>
                    <span className="block text-[10px] text-muted-foreground">SCREEN {index + 1}</span>
                    <span className="block truncate text-sm font-medium">{screen.title}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 border-b pb-3">
                <Button size="sm" variant="outline" onClick={() => moveScreen(currentScreen.id, -1)} disabled={config.screens[0]?.id === currentScreen.id} title="Move screen earlier"><ArrowUp className="size-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => moveScreen(currentScreen.id, 1)} disabled={config.screens[config.screens.length - 1]?.id === currentScreen.id} title="Move screen later"><ArrowDown className="size-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => duplicateScreen(currentScreen.id)} disabled={config.screens.length >= 10}><Copy className="mr-1 size-3.5" />Duplicate screen</Button>
                <Button size="sm" variant="outline" onClick={() => deleteScreen(currentScreen.id)} disabled={config.screens.length <= 1} className="text-destructive"><Trash2 className="mr-1 size-3.5" />Delete</Button>
              </div>
              <div className="mx-auto max-w-xl space-y-3 rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-3 border-b pb-3">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Screen title</label>
                    <Input value={currentScreen.title} maxLength={20} onChange={(event) => updateScreen(currentScreen.id, { title: event.target.value })} />
                    <p className="mt-1 text-[11px] text-muted-foreground">ID: {currentScreen.id}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => setFinalScreen(currentScreen.id)} disabled={currentScreen.terminal} title="Set as final submission screen">Set final</Button>
                    </div>
                </div>
                {currentScreen.components.map((component, index) => (
                  <div key={component.id} className={`rounded-lg border p-3 ${selectedComponentId === component.id ? "border-[#5F7C65] ring-1 ring-[#5F7C65]/30" : ""}`}>
                    <button className="w-full text-left" onClick={() => setSelectedComponentId(component.id)}>
                      <p className="text-[11px] font-medium text-[#5F7C65]">{componentLabels[component.type]}</p>
                      <p className="mt-1 truncate text-sm font-medium">{component.type === "TextHeading" || component.type === "TextBody" ? component.text : component.label}</p>
                      {component.placeholder && <p className="mt-1 truncate text-xs text-muted-foreground">Placeholder preview: {component.placeholder}</p>}
                    </button>
                    <div className="mt-2 flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => moveComponent(component.id, -1)} disabled={index === 0} aria-label="Move component up"><ArrowUp className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => moveComponent(component.id, 1)} disabled={index === currentScreen.components.length - 1} aria-label="Move component down"><ArrowDown className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => deleteComponent(component.id)} aria-label="Delete component"><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>
                ))}
                {currentScreen.components.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Choose a component from the left to add it to this screen.</p>}
                <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  {currentScreen.terminal ? "Final submission screen" : `Continue to ${config.screens.find((screen) => screen.id === currentScreen.nextScreenId)?.title || "select a screen"}`}
                </div>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <FlowPreview
              key={config.screens.map((screen) => screen.id).join(":")}
              screens={config.screens}
            />
          )}

          {activeTab === "json" && (
            <div className="space-y-3 p-4">
              {validationErrors.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Fix these items before saving or publishing:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
                </div>
              )}
              <pre className="max-h-[620px] overflow-auto rounded-lg bg-stone-950 p-4 text-xs leading-5 text-stone-100"><code>{JSON.stringify(flowJson, null, 2)}</code></pre>
            </div>
          )}
        </section>

        <aside className="min-w-0 rounded-xl border bg-card p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
          <h2 className="mb-4 text-sm font-semibold">Properties</h2>
          {selectedComponent && currentScreen ? (
            <ComponentProperties
              component={selectedComponent}
              onChange={(patch) => updateComponent(selectedComponent.id, patch)}
            />
          ) : currentScreen ? (
            <ScreenProperties
              screen={currentScreen}
              screens={config.screens}
              onChange={(patch) => updateScreen(currentScreen.id, patch)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select or create a screen to configure its properties.</p>
          )}
          {validationErrors.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Validation ({validationErrors.length})</p>
              <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {validationErrors.slice(0, 6).map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <p className="text-center text-xs text-muted-foreground">Flow JSON v7.3 · Publish changes status in WaChat only; it does not publish to Meta.</p>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}>
      {icon}{children}
    </button>
  );
}

function ScreenProperties({
  screen,
  screens,
  onChange,
}: {
  screen: FlowScreen;
  screens: FlowScreen[];
  onChange: (patch: Partial<FlowScreen>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Screen ID: <code>{screen.id}</code></p>
      <label className="block space-y-1.5 text-xs font-medium">
        Screen title
        <Input maxLength={20} value={screen.title} onChange={(event) => onChange({ title: event.target.value })} />
      </label>
      {!screen.terminal ? (
        <label className="block space-y-1.5 text-xs font-medium">
          Navigate to
          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={screen.nextScreenId || ""} onChange={(event) => onChange({ nextScreenId: event.target.value || null })}>
            <option value="">Select next screen</option>
            {screens.filter((item) => item.id !== screen.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
      ) : (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300">This screen submits and completes the Flow.</div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">Use the screen controls in the editor to duplicate, reorder, rename, delete, or choose the final screen.</p>
    </div>
  );
}

function ComponentProperties({
  component,
  onChange,
}: {
  component: FlowComponent;
  onChange: (patch: Partial<FlowComponent>) => void;
}) {
  const textComponent = component.type === "TextHeading" || component.type === "TextBody";
  const choices = isChoiceType(component.type);

  function updateOption(index: number, patch: Partial<FlowOption>) {
    onChange({
      options: component.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    });
  }

  return (
    <div className="space-y-4">
      <Badge variant="outline">{componentLabels[component.type]}</Badge>
      {textComponent ? (
        <label className="block space-y-1.5 text-xs font-medium">
          {component.type === "TextHeading" ? "Heading text" : "Body text"}
          <Textarea value={component.text} maxLength={component.type === "TextHeading" ? 80 : 4096} onChange={(event) => onChange({ text: event.target.value })} />
        </label>
      ) : (
        <>
          <label className="block space-y-1.5 text-xs font-medium">
            Label
            <Input value={component.label} maxLength={component.type === "TextInput" || component.type === "TextArea" ? 20 : 30} onChange={(event) => onChange({ label: event.target.value })} />
          </label>
          <label className="block space-y-1.5 text-xs font-medium">
            Component name
            <Input value={component.name} maxLength={60} onChange={(event) => onChange({ name: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} />
            <span className="block font-normal text-muted-foreground">Lowercase letters, numbers, underscores; used in submitted data.</span>
          </label>
          <label className="block space-y-1.5 text-xs font-medium">
            <span>Preview placeholder</span>
            <Input value={component.placeholder} onChange={(event) => onChange({ placeholder: event.target.value })} placeholder="Example shown in preview" />
            <span className="block font-normal text-muted-foreground">WhatsApp Flow JSON does not support placeholders inside a Form; this appears in the builder preview only.</span>
          </label>
          {(component.type === "TextInput" || component.type === "TextArea") && (
            <>
              {component.type === "TextInput" && (
                <label className="block space-y-1.5 text-xs font-medium">
                  Input type
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={component.inputType} onChange={(event) => onChange({ inputType: event.target.value as FlowComponent["inputType"] })}>
                    <option value="text">Text</option><option value="email">Email</option><option value="number">Number</option><option value="phone">Phone</option>
                  </select>
                </label>
              )}
              <div className={`grid gap-2 ${component.type === "TextInput" ? "grid-cols-2" : "grid-cols-1"}`}>
                {component.type === "TextInput" && <NumberProperty label="Min characters" value={component.minChars} min={0} max={component.maxChars} onChange={(value) => onChange({ minChars: value })} />}
                <NumberProperty label="Max characters" value={component.maxChars} min={1} max={component.type === "TextArea" ? 600 : 80} onChange={(value) => onChange({ maxChars: value })} />
              </div>
              <label className="block space-y-1.5 text-xs font-medium">
                Helper text
                <Input value={component.helperText} maxLength={80} onChange={(event) => onChange({ helperText: event.target.value })} />
              </label>
            </>
          )}
          {component.type === "DatePicker" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1.5 text-xs font-medium">Minimum date
                <Input type="date" value={component.minDate} onChange={(event) => onChange({ minDate: event.target.value })} />
              </label>
              <label className="block space-y-1.5 text-xs font-medium">Maximum date
                <Input type="date" value={component.maxDate} onChange={(event) => onChange({ maxDate: event.target.value })} />
              </label>
            </div>
          )}
          {component.type === "CheckboxGroup" && (
            <div className="grid grid-cols-2 gap-2">
              <NumberProperty label="Min selections" value={component.minSelections} min={0} max={20} onChange={(value) => onChange({ minSelections: value })} />
              <NumberProperty label="Max selections" value={component.maxSelections} min={0} max={20} onChange={(value) => onChange({ maxSelections: value })} />
            </div>
          )}
          {choices && (
            <fieldset className="space-y-2 border-t pt-3">
              <legend className="mb-1 text-xs font-semibold">Options (1–20)</legend>
              {component.options.map((option, index) => (
                <div key={index} className="space-y-1 rounded-md border p-2">
                  <label className="block space-y-1 text-[11px] text-muted-foreground">
                    Option {index + 1} label
                    <Input value={option.title} maxLength={30} aria-label={`Option ${index + 1} label`} onChange={(event) => updateOption(index, { title: event.target.value })} />
                  </label>
                  <div className="flex items-center gap-1">
                    <label className="min-w-0 flex-1 space-y-1 text-[11px] text-muted-foreground">
                      Option ID
                      <Input value={option.id} maxLength={30} aria-label={`Option ${index + 1} ID`} onChange={(event) => updateOption(index, { id: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })} />
                    </label>
                    <Button size="icon" variant="ghost" className="mt-4 shrink-0 text-destructive" aria-label={`Remove option ${index + 1}`} disabled={component.options.length <= 1} onClick={() => onChange({ options: component.options.filter((_, optionIndex) => optionIndex !== index) })}><X className="size-4" /></Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full" disabled={component.options.length >= 20} onClick={() => {
                onChange({ options: [...component.options, createNextFlowOption(component.options)] });
              }}><Plus className="mr-1.5 size-4" />Add option</Button>
            </fieldset>
          )}
          <label className="flex items-center gap-2 border-t pt-3 text-xs font-medium">
            <input type="checkbox" checked={component.required} onChange={(event) => onChange({ required: event.target.checked })} />
            Required field
          </label>
        </>
      )}
    </div>
  );
}

function NumberProperty({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1.5 text-xs font-medium">
      {label}
      <Input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
