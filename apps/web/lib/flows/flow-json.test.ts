import assert from "node:assert/strict";
import test from "node:test";
import { generateFlowJson, validateFlowConfig } from "./flow-json";
import {
  createDefaultFlowConfig,
  createFlowComponent,
  createNextFlowOption,
  type FlowBuilderConfig,
} from "./flow-types";

test("generates a valid terminal-only static Flow", () => {
  const config = createDefaultFlowConfig();
  const errors = validateFlowConfig(config, "OTHER");
  assert.deepEqual(errors, []);

  const generated = generateFlowJson(config) as {
    version: string;
    routing_model?: unknown;
    screens: Array<{ terminal?: boolean; layout: { children: Array<{ children: Array<{ type: string }> }> } }>;
  };
  assert.equal(generated.version, "7.3");
  assert.equal(generated.routing_model, undefined);
  assert.equal(generated.screens.length, 1);
  assert.equal(generated.screens[0].terminal, true);
  assert.equal(generated.screens[0].layout.children[0].children.at(-1)?.type, "Footer");
});

test("builds form values, next-screen navigation, and screen data models", () => {
  const first = createDefaultFlowConfig().screens[0];
  const nameInput = createFlowComponent("TextInput");
  nameInput.name = "customer_name";
  nameInput.label = "Name";
  const numberInput = createFlowComponent("TextInput");
  numberInput.name = "party_size";
  numberInput.inputType = "number";
  first.components = [nameInput, numberInput];
  first.terminal = false;
  first.nextScreenId = "CONFIRM";

  const config: FlowBuilderConfig = {
    screens: [
      first,
      {
        id: "CONFIRM",
        title: "Confirmation",
        components: [createFlowComponent("TextBody")],
        nextScreenId: null,
        terminal: true,
      },
    ],
  };

  assert.deepEqual(validateFlowConfig(config, "LEAD_GENERATION"), []);
  const generated = generateFlowJson(config) as {
    screens: Array<{
      data?: Record<string, { type: string; __example__?: unknown }>;
      layout: { children: Array<{ children: Array<Record<string, unknown>> }> };
    }>;
  };
  const firstChildren = generated.screens[0].layout.children[0].children;
  const navigation = firstChildren[firstChildren.length - 1]["on-click-action"] as {
    name: string;
    next: { name: string };
    payload: Record<string, string>;
  };
  assert.equal(navigation.name, "navigate");
  assert.equal(navigation.next.name, "CONFIRM");
  assert.equal(navigation.payload.customer_name, "${form.customer_name}");
  assert.equal(generated.screens[1].data?.party_size.type, "number");
  assert.equal(generated.screens[1].data?.customer_name.type, "string");
});

test("rejects invalid component names and broken navigation", () => {
  const config = createDefaultFlowConfig();
  const input = createFlowComponent("TextInput");
  input.name = "Not valid";
  config.screens[0].components.push(input);
  config.screens[0].terminal = false;
  config.screens[0].nextScreenId = config.screens[0].id;

  const errors = validateFlowConfig(config, "OTHER");
  assert.ok(errors.some((error) => error.includes("valid field name")));
  assert.ok(errors.some((error) => error.includes("cannot navigate to itself")));
});

test("adds choice options without reusing an existing option ID", () => {
  const options = [
    { id: "OPTION_1", title: "First" },
    { id: "OPTION_3", title: "Third" },
  ];

  assert.deepEqual(createNextFlowOption(options), { id: "OPTION_2", title: "Option 2" });
});

test("reports invalid choice options with their position", () => {
  const config = createDefaultFlowConfig();
  const choices = createFlowComponent("RadioButtonsGroup");
  choices.options = [
    { id: "OPTION_1", title: "First" },
    { id: "OPTION_1", title: " " },
  ];
  config.screens[0].components.push(choices);

  const errors = validateFlowConfig(config, "OTHER");
  assert.ok(errors.some((error) => error.includes('RadioButtonsGroup "Choose one": Option 2 ID "OPTION_1" is duplicated.')));
  assert.ok(errors.some((error) => error.includes("Option 2 label must be 1–30 characters.")));
});

test("generates only the configured supported input components", () => {
  const config = createDefaultFlowConfig();
  const types = [
    "TextInput",
    "TextArea",
    "RadioButtonsGroup",
    "CheckboxGroup",
    "Dropdown",
    "DatePicker",
    "OptIn",
  ] as const;
  config.screens[0].components = types.map((type, index) => {
    const component = createFlowComponent(type, index + 1);
    component.name = `field_${index + 1}`;
    component.label = `Field ${index + 1}`;
    return component;
  });

  assert.deepEqual(validateFlowConfig(config, "OTHER"), []);
  const generated = generateFlowJson(config) as {
    screens: Array<{ layout: { children: Array<{ children: Array<Record<string, unknown>> }> } }>;
  };
  const generatedTypes = generated.screens[0].layout.children[0].children.map((component) => component.type);
  assert.deepEqual(generatedTypes, [...types, "Footer"]);
});

test("serializes min-chars, max-chars, and max-length as numbers", () => {
  const config = createDefaultFlowConfig();
  const textInput = createFlowComponent("TextInput");
  textInput.name = "text_field";
  textInput.label = "Text Field";
  textInput.minChars = 5;
  textInput.maxChars = 60;

  const textArea = createFlowComponent("TextArea");
  textArea.name = "textarea_field";
  textArea.label = "Text Area Field";
  textArea.maxChars = 300;

  const checkbox = createFlowComponent("CheckboxGroup");
  checkbox.name = "checkbox_field";
  checkbox.label = "Checkbox Field";
  checkbox.minSelections = 1;
  checkbox.maxSelections = 3;

  config.screens[0].components = [textInput, textArea, checkbox];

  assert.deepEqual(validateFlowConfig(config, "OTHER"), []);
  const generated = generateFlowJson(config) as {
    screens: Array<{ layout: { children: Array<{ children: Array<Record<string, unknown>> }> } }>;
  };
  const children = generated.screens[0].layout.children[0].children;
  const metaTextInput = children[0];
  const metaTextArea = children[1];
  const metaCheckbox = children[2];

  assert.equal(typeof metaTextInput["min-chars"], "number");
  assert.equal(metaTextInput["min-chars"], 5);
  assert.equal(typeof metaTextInput["max-chars"], "number");
  assert.equal(metaTextInput["max-chars"], 60);

  assert.equal(typeof metaTextArea["max-length"], "number");
  assert.equal(metaTextArea["max-length"], 300);

  assert.equal(typeof metaCheckbox["min-selected-items"], "number");
  assert.equal(metaCheckbox["min-selected-items"], 1);
  assert.equal(typeof metaCheckbox["max-selected-items"], "number");
  assert.equal(metaCheckbox["max-selected-items"], 3);
});
