"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlowComponent, FlowScreen } from "@/lib/flows/flow-types";

type PreviewValue = string | string[] | boolean;

interface FlowPreviewProps {
  screens: FlowScreen[];
}

export default function FlowPreview({ screens }: FlowPreviewProps) {
  const [currentId, setCurrentId] = useState(screens[0]?.id ?? "");
  const [history, setHistory] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, PreviewValue>>({});

  const currentScreen = useMemo(
    () => screens.find((screen) => screen.id === currentId) ?? screens[0],
    [currentId, screens],
  );

  useEffect(() => {
    if (!screens.some((screen) => screen.id === currentId)) {
      setCurrentId(screens[0]?.id ?? "");
      setHistory([]);
      setCompleted(false);
      setValues({});
    }
  }, [currentId, screens]);

  if (!currentScreen) return <p className="p-6 text-sm text-muted-foreground">Add a screen to preview your Flow.</p>;

  function continueFlow() {
    const missing = currentScreen.components.find(
      (component) => {
        const value = values[`${currentScreen.id}:${component.name}`];
        const hasValue = Array.isArray(value)
          ? value.length > 0
          : typeof value === "boolean"
            ? value
            : typeof value === "string" && value.trim().length > 0;
        return component.required && isInputComponent(component) && !hasValue;
      },
    );
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setError("");
    if (currentScreen.terminal) {
      setCompleted(true);
      return;
    }
    if (currentScreen.nextScreenId && screens.some((screen) => screen.id === currentScreen.nextScreenId)) {
      setHistory((items) => [...items, currentScreen.id]);
      setCurrentId(currentScreen.nextScreenId);
    } else {
      setError("Choose a valid next screen in the screen settings.");
    }
  }

  function updateValue(screenId: string, fieldName: string, value: PreviewValue) {
    setValues((current) => ({ ...current, [`${screenId}:${fieldName}`]: value }));
  }

  function goBack() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((items) => items.slice(0, -1));
    setCurrentId(previous);
    setError("");
  }

  function restart() {
    setCurrentId(screens[0]?.id ?? "");
    setHistory([]);
    setCompleted(false);
    setError("");
    setValues({});
  }

  return (
    <div className="flex min-h-[570px] items-center justify-center rounded-xl bg-stone-100 p-4 dark:bg-stone-950">
      <div className="w-full max-w-[330px] overflow-hidden rounded-[2rem] border-[7px] border-stone-900 bg-white shadow-xl dark:border-stone-700">
        <div className="flex h-8 items-center justify-center bg-stone-900"><div className="h-1.5 w-16 rounded-full bg-stone-600" /></div>
        <div className="flex h-12 items-center gap-2 border-b bg-[#075E54] px-4 text-sm font-medium text-white">
          {history.length > 0 && !completed ? <button onClick={goBack} aria-label="Previous screen"><ArrowLeft className="size-4" /></button> : null}
          <span className="truncate">Business</span>
          <span className="ml-auto text-[11px] opacity-80">Flow preview</span>
        </div>
        {completed ? (
          <div className="flex min-h-[440px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 rounded-full bg-emerald-100 p-3 text-emerald-700"><Check className="size-7" /></div>
            <h3 className="text-lg font-semibold text-stone-900">Response submitted</h3>
            <p className="mt-2 text-sm text-stone-500">This is the final submission screen in your static Flow.</p>
            <Button size="sm" variant="outline" className="mt-6" onClick={restart}><RotateCcw className="mr-2 size-4" />Start over</Button>
          </div>
        ) : (
          <>
            <div className="border-b bg-stone-50 px-4 py-3">
              <p className="text-[11px] text-stone-500">Screen {screens.findIndex((screen) => screen.id === currentScreen.id) + 1} of {screens.length}</p>
              <h3 className="mt-0.5 truncate text-sm font-semibold text-stone-900">{currentScreen.title}</h3>
            </div>
            <div className="max-h-[390px] min-h-[300px] space-y-4 overflow-y-auto p-4">
              {currentScreen.components.length === 0 && <p className="text-sm text-stone-500">Add components to this screen.</p>}
              {currentScreen.components.map((component) => (
                <PreviewField
                  key={component.id}
                  screenId={currentScreen.id}
                  component={component}
                  value={values[`${currentScreen.id}:${component.name}`]}
                  onValueChange={updateValue}
                />
              ))}
            </div>
            <div className="border-t p-4">
              {error && <p role="alert" className="mb-2 text-xs text-red-600">{error}</p>}
              <Button className="w-full bg-[#075E54] hover:bg-[#064e46]" onClick={continueFlow}>
                {currentScreen.terminal ? "Submit" : "Continue"}
                {!currentScreen.terminal && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </div>
          </>
        )}
        <div className="h-5 bg-white" />
      </div>
    </div>
  );
}

function PreviewField({
  screenId,
  component,
  value,
  onValueChange,
}: {
  screenId: string;
  component: FlowComponent;
  value?: PreviewValue;
  onValueChange: (screenId: string, fieldName: string, value: PreviewValue) => void;
}) {
  const fieldKey = `${screenId}:${component.name}`;
  if (component.type === "TextHeading") return <h4 className="text-base font-semibold text-stone-900">{component.text}</h4>;
  if (component.type === "TextBody") return <p className="whitespace-pre-wrap text-sm leading-5 text-stone-600">{component.text}</p>;

  if (component.type === "RadioButtonsGroup") {
    return (
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-stone-800">{component.label}{component.required ? " *" : ""}</legend>
        {component.options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm text-stone-700">
            <input data-preview-field={fieldKey} type="radio" name={fieldKey} value={option.id} checked={value === option.id} onChange={(event) => onValueChange(screenId, component.name, event.target.value)} />
            {option.title}
          </label>
        ))}
        {component.helperText && <p className="text-xs text-stone-500">{component.helperText}</p>}
      </fieldset>
    );
  }

  if (component.type === "CheckboxGroup") {
    return (
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-stone-800">{component.label}{component.required ? " *" : ""}</legend>
        {component.options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm text-stone-700">
            <input
              data-preview-field={`${fieldKey}:${option.id}`}
              type="checkbox"
              value={option.id}
              checked={Array.isArray(value) && value.includes(option.id)}
              onChange={(event) => {
                const selected = Array.isArray(value) ? value : [];
                onValueChange(
                  screenId,
                  component.name,
                  event.target.checked
                    ? [...selected, option.id]
                    : selected.filter((item) => item !== option.id),
                );
              }}
            />
            {option.title}
          </label>
        ))}
      </fieldset>
    );
  }

  if (component.type === "Dropdown") {
    return (
      <label className="block space-y-1.5 text-sm font-medium text-stone-800">
        {component.label}{component.required ? " *" : ""}
        <select data-preview-field={fieldKey} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" value={typeof value === "string" ? value : ""} onChange={(event) => onValueChange(screenId, component.name, event.target.value)}>
          <option value="" disabled>Select an option</option>
          {component.options.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
        </select>
      </label>
    );
  }

  if (component.type === "OptIn") {
    return (
      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input data-preview-field={fieldKey} type="checkbox" className="mt-1" checked={value === true} onChange={(event) => onValueChange(screenId, component.name, event.target.checked)} />
        <span>{component.label}{component.required ? " *" : ""}</span>
      </label>
    );
  }

  if (component.type === "DatePicker") {
    return (
      <label className="block space-y-1.5 text-sm font-medium text-stone-800">
        {component.label}{component.required ? " *" : ""}
        <input data-preview-field={fieldKey} type="date" value={typeof value === "string" ? value : ""} min={component.minDate || undefined} max={component.maxDate || undefined} className="w-full rounded-lg border px-3 py-2 text-sm" onChange={(event) => onValueChange(screenId, component.name, event.target.value)} />
      </label>
    );
  }

  const inputType = component.type === "TextInput"
    ? component.inputType === "phone" ? "tel" : component.inputType
    : undefined;
  const placeholder = component.placeholder || `Enter ${component.label.toLowerCase()}`;
  return (
    <label className="block space-y-1.5 text-sm font-medium text-stone-800">
      {component.label}{component.required ? " *" : ""}
      {component.type === "TextArea" ? (
        <textarea data-preview-field={fieldKey} value={typeof value === "string" ? value : ""} maxLength={component.maxChars} placeholder={placeholder} className="min-h-20 w-full rounded-lg border px-3 py-2 text-sm font-normal" onChange={(event) => onValueChange(screenId, component.name, event.target.value)} />
      ) : (
        <input data-preview-field={fieldKey} type={inputType} value={typeof value === "string" ? value : ""} maxLength={component.maxChars} minLength={component.minChars || undefined} placeholder={placeholder} className="w-full rounded-lg border px-3 py-2 text-sm font-normal" onChange={(event) => onValueChange(screenId, component.name, event.target.value)} />
      )}
      {component.helperText && <span className="block text-xs font-normal text-stone-500">{component.helperText}</span>}
    </label>
  );
}

function isInputComponent(component: FlowComponent): boolean {
  return component.type !== "TextHeading" && component.type !== "TextBody";
}
