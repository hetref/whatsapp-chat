import {
  FLOW_CATEGORIES,
  FLOW_COMPONENT_TYPES,
  FLOW_JSON_VERSION,
  isChoiceType,
  type FlowBuilderConfig,
  type FlowComponent,
  type FlowComponentType,
  type FlowScreen,
} from "./flow-types";

type JsonRecord = Record<string, unknown>;

const FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]{0,59}$/;
const SCREEN_ID_PATTERN = /^[A-Z][A-Z0-9_]{0,59}$/;

export function validateFlowConfig(
  config: FlowBuilderConfig,
  category: string,
): string[] {
  const errors: string[] = [];

  if (!FLOW_CATEGORIES.includes(category as (typeof FLOW_CATEGORIES)[number])) {
    errors.push("Choose a supported Flow category.");
  }
  if (!config || !Array.isArray(config.screens) || config.screens.length === 0) {
    return [...errors, "A Flow must contain at least one screen."];
  }

  const screens = config.screens;
  const screenIds = new Set<string>();
  const terminalScreens = screens.filter((screen) => screen.terminal);

  if (screens.length > 10) errors.push("A Flow can contain at most 10 screens.");
  if (terminalScreens.length !== 1) errors.push("Choose exactly one final submission screen.");

  for (const screen of screens) {
    if (!SCREEN_ID_PATTERN.test(screen.id) || screen.id === "SUCCESS") {
      errors.push(`Screen "${screen.title}" has an invalid or reserved ID.`);
    }
    if (screenIds.has(screen.id)) errors.push(`Screen ID "${screen.id}" is duplicated.`);
    screenIds.add(screen.id);
    if (!screen.title.trim() || screen.title.length > 20) {
      errors.push(`Screen "${screen.id}" needs a title of 1–20 characters.`);
    }
    if (!Array.isArray(screen.components) || screen.components.length + 1 > 50) {
      errors.push(`Screen "${screen.title}" can contain at most 49 content components.`);
      continue;
    }

    const fieldNames = new Set<string>();
    for (const component of screen.components) {
      const componentErrors = validateComponent(component);
      errors.push(...componentErrors.map(
        (error) => `${screen.title} · ${component.type} "${component.label}": ${error}`,
      ));
      if (isInputType(component.type)) {
        if (!FIELD_NAME_PATTERN.test(component.name)) {
          errors.push(`${screen.title}: "${component.label}" needs a valid field name (lowercase letters, numbers, underscores).`);
        } else if (fieldNames.has(component.name)) {
          errors.push(`${screen.title}: field name "${component.name}" is duplicated.`);
        }
        fieldNames.add(component.name);
      }
    }
  }

  for (const screen of screens) {
    if (screen.terminal) {
      if (screen.nextScreenId) errors.push(`${screen.title}: the final screen cannot navigate to another screen.`);
    } else if (!screen.nextScreenId || !screenIds.has(screen.nextScreenId)) {
      errors.push(`${screen.title}: choose a valid next screen.`);
    } else if (screen.nextScreenId === screen.id) {
      errors.push(`${screen.title}: a screen cannot navigate to itself.`);
    }
  }

  if (terminalScreens.length === 1 && screens.length > 0) {
    const byId = new Map(screens.map((screen) => [screen.id, screen]));
    const visited = new Set<string>();
    let current: FlowScreen | undefined = screens[0];
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.terminal) break;
      current = current.nextScreenId ? byId.get(current.nextScreenId) : undefined;
    }
    if (!current?.terminal) errors.push("Navigation from the first screen must reach the final submission screen without a cycle.");
    if (visited.size !== screens.length) errors.push("Every screen must be reachable from the first screen.");
  }

  return [...new Set(errors)];
}

export function generateFlowJson(config: FlowBuilderConfig): JsonRecord {
  const screens = config.screens;
  const screenData = buildScreenData(screens);

  return {
    version: FLOW_JSON_VERSION,
    screens: screens.map((screen) => {
      const children = screen.components.map(toMetaComponent);
      const formChildren = [
        ...children,
        {
          type: "Footer",
          label: screen.terminal ? "Submit" : "Continue",
          "on-click-action": screen.terminal
            ? {
                name: "complete",
                payload: buildPayload(screen),
              }
            : {
                name: "navigate",
                next: { type: "screen", name: screen.nextScreenId },
                payload: buildPayload(screen),
              },
        },
      ];

      return {
        id: screen.id,
        title: screen.title,
        ...(screen.terminal ? { terminal: true, success: true } : {}),
        ...(screenData[screen.id] ? { data: screenData[screen.id] } : {}),
        layout: {
          type: "SingleColumnLayout",
          children: [{ type: "Form", name: "form", children: formChildren }],
        },
      };
    }),
  };
}

function buildScreenData(screens: FlowScreen[]): Record<string, JsonRecord> {
  const data: Record<string, JsonRecord> = {};
  for (const screen of screens) {
    if (screen.terminal || !screen.nextScreenId) continue;
    const destination = data[screen.nextScreenId] ?? {};
    for (const component of screen.components.filter((item) => isInputType(item.type))) {
      destination[component.name] = exampleFor(component);
    }
    data[screen.nextScreenId] = destination;
  }
  return data;
}

function exampleFor(component: FlowComponent): JsonRecord {
  if (component.type === "CheckboxGroup") {
    return {
      type: "array",
      items: { type: "string" },
      __example__: component.options[0]?.id ? [component.options[0].id] : [],
    };
  }
  if (component.type === "OptIn") {
    return { type: "boolean", __example__: false };
  }
  if (component.type === "TextInput" && component.inputType === "number") {
    return { type: "number", __example__: 123 };
  }
  if (component.type === "DatePicker") {
    return { type: "string", __example__: "2026-01-15" };
  }
  if (isChoiceType(component.type)) {
    return { type: "string", __example__: component.options[0]?.id || "OPTION_1" };
  }
  if (component.type === "TextInput" && component.inputType === "email") {
    return { type: "string", __example__: "name@example.com" };
  }
  if (component.type === "TextInput" && component.inputType === "phone") {
    return { type: "string", __example__: "+15555550123" };
  }
  return { type: "string", __example__: "Example" };
}

function buildPayload(screen: FlowScreen): JsonRecord {
  const payload: JsonRecord = {};
  for (const component of screen.components.filter((item) => isInputType(item.type))) {
    payload[component.name] = `\${form.${component.name}}`;
  }
  return payload;
}

function toMetaComponent(component: FlowComponent): JsonRecord {
  if (component.type === "TextHeading" || component.type === "TextBody") {
    return { type: component.type, text: component.text.trim() };
  }

  const result: JsonRecord = {
    type: component.type,
    name: component.name,
    label: component.label.trim(),
    ...(component.required ? { required: true } : {}),
    ...(component.helperText.trim() && (component.type === "TextInput" || component.type === "TextArea")
      ? { "helper-text": component.helperText.trim() }
      : {}),
  };

  if (component.type === "TextInput") {
    result["input-type"] = component.inputType;
    if (component.minChars > 0) result["min-chars"] = Number(component.minChars);
    if (component.maxChars > 0) result["max-chars"] = Number(component.maxChars);
  }
  if (component.type === "TextArea" && component.maxChars > 0) {
    result["max-length"] = Number(component.maxChars);
  }
  if (component.type === "DatePicker") {
    if (component.minDate) result["min-date"] = component.minDate;
    if (component.maxDate) result["max-date"] = component.maxDate;
  }
  if (component.type === "CheckboxGroup") {
    if (component.minSelections > 0) result["min-selected-items"] = Number(component.minSelections);
    if (component.maxSelections > 0) result["max-selected-items"] = Number(component.maxSelections);
  }
  if (component.type === "RadioButtonsGroup" || component.type === "CheckboxGroup" || component.type === "Dropdown") {
    result["data-source"] = component.options.map(({ id, title }) => ({ id, title }));
  }
  return result;
}

function validateComponent(component: FlowComponent): string[] {
  const errors: string[] = [];
  if (!FLOW_COMPONENT_TYPES.includes(component.type as FlowComponentType)) {
    return [`has an unsupported component type "${String(component.type)}".`];
  }
  if (component.type === "TextHeading" && (!component.text.trim() || component.text.length > 80)) {
    errors.push("Text Heading must be 1–80 characters.");
  }
  if (component.type === "TextBody" && (!component.text.trim() || component.text.length > 4096)) {
    errors.push("Text Body must be 1–4096 characters.");
  }
  if (isInputType(component.type) && !component.label.trim()) {
    errors.push(`${component.type} needs a label.`);
  }
  if ((component.type === "TextInput" || component.type === "TextArea") && component.helperText.length > 80) {
    errors.push(`${component.type} helper text can be at most 80 characters.`);
  }
  if ((component.type === "TextInput" || component.type === "TextArea") && component.label.length > 20) {
    errors.push(`${component.type} label can be at most 20 characters.`);
  }
  if (component.type !== "TextInput" && component.type !== "TextArea" &&
      isInputType(component.type) && component.label.length > 30) {
    errors.push(`${component.type} label can be at most 30 characters.`);
  }
  if ((component.type === "TextInput" || component.type === "TextArea") &&
      (!Number.isInteger(component.maxChars) || component.maxChars < 1 ||
        component.maxChars > (component.type === "TextArea" ? 600 : 80))) {
    errors.push(`${component.type} maximum character limit is invalid.`);
  }
  if (component.type === "TextInput" &&
      (!Number.isInteger(component.minChars) || component.minChars < 0 || component.minChars > component.maxChars)) {
    errors.push("Text Input minimum character limit is invalid.");
  }
  if (component.type === "DatePicker") {
    if (component.minDate && !isIsoDate(component.minDate)) errors.push("Date Picker minimum date must be YYYY-MM-DD.");
    if (component.maxDate && !isIsoDate(component.maxDate)) errors.push("Date Picker maximum date must be YYYY-MM-DD.");
    if (component.minDate && component.maxDate && component.minDate > component.maxDate) {
      errors.push("Date Picker minimum date must not be after the maximum date.");
    }
  }
  if (isChoiceType(component.type)) {
    if (component.options.length < 1 || component.options.length > 20) {
      errors.push(`${component.type} needs 1–20 options.`);
    }
    const ids = new Set<string>();
    component.options.forEach((option, index) => {
      const optionLabel = `Option ${index + 1}`;
      if (!/^[A-Z0-9_]{1,30}$/.test(option.id)) {
        errors.push(`${optionLabel} ID must use 1–30 uppercase letters, numbers, or underscores.`);
      }
      if (!option.title.trim() || option.title.length > 30) {
        errors.push(`${optionLabel} label must be 1–30 characters.`);
      }
      if (ids.has(option.id)) errors.push(`${optionLabel} ID "${option.id}" is duplicated.`);
      ids.add(option.id);
    });
  }
  if (component.type === "CheckboxGroup" &&
      (!Number.isInteger(component.minSelections) || !Number.isInteger(component.maxSelections) ||
        component.minSelections < 0 || component.maxSelections < 0 ||
        component.minSelections > 20 || component.maxSelections > 20 ||
        (component.maxSelections > 0 && component.minSelections > component.maxSelections))) {
    errors.push("Checkbox selection limits are invalid.");
  }
  return errors;
}

function isInputType(type: FlowComponentType): boolean {
  return type !== "TextHeading" && type !== "TextBody";
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
