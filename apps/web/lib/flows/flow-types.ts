export const FLOW_JSON_VERSION = "7.3" as const;

export const FLOW_CATEGORIES = [
  "OTHER",
  "SIGN_UP",
  "SIGN_IN",
  "APPOINTMENT_BOOKING",
  "LEAD_GENERATION",
  "CONTACT_US",
  "CUSTOMER_SUPPORT",
  "SURVEY",
] as const;

export type FlowCategory = (typeof FLOW_CATEGORIES)[number];
export type FlowStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED";

export const FLOW_COMPONENT_TYPES = [
  "TextHeading",
  "TextBody",
  "TextInput",
  "TextArea",
  "RadioButtonsGroup",
  "CheckboxGroup",
  "Dropdown",
  "DatePicker",
  "OptIn",
] as const;

export type FlowComponentType = (typeof FLOW_COMPONENT_TYPES)[number];

export interface FlowOption {
  id: string;
  title: string;
}

export function createNextFlowOption(options: FlowOption[]): FlowOption {
  const existingIds = new Set(options.map((option) => option.id));
  let number = 1;
  while (existingIds.has(`OPTION_${number}`)) number += 1;
  return { id: `OPTION_${number}`, title: `Option ${number}` };
}

export interface FlowComponent {
  id: string;
  type: FlowComponentType;
  name: string;
  label: string;
  text: string;
  placeholder: string;
  helperText: string;
  required: boolean;
  inputType: "text" | "email" | "number" | "phone";
  minChars: number;
  maxChars: number;
  minDate: string;
  maxDate: string;
  minSelections: number;
  maxSelections: number;
  options: FlowOption[];
}

export interface FlowScreen {
  id: string;
  title: string;
  components: FlowComponent[];
  nextScreenId: string | null;
  terminal: boolean;
}

export interface FlowBuilderConfig {
  screens: FlowScreen[];
}

export interface StoredFlow {
  id: string;
  name: string;
  description: string | null;
  category: FlowCategory;
  status: FlowStatus;
  metaFlowId: string | null;
  flowJson: Record<string, unknown>;
  screenConfig: FlowBuilderConfig;
  createdAt: string;
  updatedAt: string;
}

export function createDefaultFlowConfig(): FlowBuilderConfig {
  return {
    screens: [
      {
        id: "WELCOME",
        title: "Welcome",
        components: [
          createFlowComponent("TextHeading"),
          createFlowComponent("TextBody"),
        ],
        nextScreenId: null,
        terminal: true,
      },
    ],
  };
}

export function createFlowComponent(
  type: FlowComponentType,
  position = 1,
): FlowComponent {
  const labelByType: Record<FlowComponentType, string> = {
    TextHeading: "Heading",
    TextBody: "Describe your form",
    TextInput: "Your answer",
    TextArea: "Tell us more",
    RadioButtonsGroup: "Choose one",
    CheckboxGroup: "Choose all that apply",
    Dropdown: "Select an option",
    DatePicker: "Choose a date",
    OptIn: "I agree to the terms",
  };
  const label = labelByType[type];
  const fieldType = ["TextInput", "TextArea", "RadioButtonsGroup", "CheckboxGroup", "Dropdown", "DatePicker", "OptIn"].includes(type);

  return {
    id: createId(),
    type,
    name: fieldType ? makeFieldName(type, position) : "",
    label,
    text: label,
    placeholder: "",
    helperText: "",
    required: false,
    inputType: "text",
    minChars: 0,
    maxChars: type === "TextArea" ? 600 : 80,
    minDate: "",
    maxDate: "",
    minSelections: 0,
    maxSelections: 0,
    options: isChoiceType(type)
      ? [
          { id: "OPTION_1", title: "Option 1" },
          { id: "OPTION_2", title: "Option 2" },
        ]
      : [],
  };
}

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function screenIdFromTitle(title: string, existingIds: string[]): string {
  const base =
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || "SCREEN";
  const used = new Set(existingIds);
  let candidate = base;
  let index = 2;
  while (used.has(candidate) || candidate === "SUCCESS") {
    candidate = `${base.slice(0, 55)}_${index}`;
    index += 1;
  }
  return candidate;
}

export function isChoiceType(type: FlowComponentType): boolean {
  return type === "RadioButtonsGroup" || type === "CheckboxGroup" || type === "Dropdown";
}

export function makeFieldName(type: FlowComponentType, position: number): string {
  const base = type
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base}_${position}`;
}
