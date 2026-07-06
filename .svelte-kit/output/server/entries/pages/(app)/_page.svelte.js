import { c as create_ssr_component, s as spread, h as escape_object, g as escape_attribute_value, a as add_attribute, v as validate_component, e as escape, b as each, m as missing_component } from "../../../chunks/ssr.js";
import { b as createEventDispatcher, s as setContext, d as getContext, c as compute_rest_props, a as subscribe } from "../../../chunks/lifecycle.js";
import { g as getCms } from "../../../chunks/context.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { S as Sparkles } from "../../../chunks/sparkles.js";
import "dequal";
import { w as withGet, o as omit, m as makeElement, a as createElHelpers, d as disabledAttr, e as executeCallbacks, b as addMeltEventListener, s as styleToString, k as kbd, c as cn, B as Button } from "../../../chunks/button.js";
import { w as writable } from "../../../chunks/index2.js";
const globals = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : (
  // @ts-ignore Node typings have this
  global
);
const overridable = (_store, onChange) => {
  const store = withGet(_store);
  const update = (updater, sideEffect) => {
    store.update((curr) => {
      const next = updater(curr);
      let res = next;
      if (onChange) {
        res = onChange({ curr, next });
      }
      sideEffect?.(res);
      return res;
    });
  };
  const set = (curr) => {
    update(() => curr);
  };
  return {
    ...store,
    update,
    set
  };
};
function toWritableStores(properties) {
  const result = {};
  Object.keys(properties).forEach((key) => {
    const propertyKey = key;
    const value = properties[propertyKey];
    result[propertyKey] = withGet(writable(value));
  });
  return result;
}
const defaults = {
  defaultChecked: false,
  disabled: false,
  required: false,
  name: "",
  value: ""
};
const { name } = createElHelpers("switch");
function createSwitch(props) {
  const propsWithDefaults = { ...defaults, ...props };
  const options = toWritableStores(omit(propsWithDefaults, "checked"));
  const { disabled, required, name: nameStore, value } = options;
  const checkedWritable = propsWithDefaults.checked ?? writable(propsWithDefaults.defaultChecked);
  const checked = overridable(checkedWritable, propsWithDefaults?.onCheckedChange);
  function toggleSwitch() {
    if (disabled.get())
      return;
    checked.update((prev) => !prev);
  }
  const root = makeElement(name(), {
    stores: [checked, disabled, required],
    returned: ([$checked, $disabled, $required]) => {
      return {
        "data-disabled": disabledAttr($disabled),
        disabled: disabledAttr($disabled),
        "data-state": $checked ? "checked" : "unchecked",
        type: "button",
        role: "switch",
        "aria-checked": $checked ? "true" : "false",
        "aria-required": $required ? "true" : void 0
      };
    },
    action(node) {
      const unsub = executeCallbacks(addMeltEventListener(node, "click", () => {
        toggleSwitch();
      }), addMeltEventListener(node, "keydown", (e) => {
        if (e.key !== kbd.ENTER && e.key !== kbd.SPACE)
          return;
        e.preventDefault();
        toggleSwitch();
      }));
      return {
        destroy: unsub
      };
    }
  });
  const input = makeElement(name("input"), {
    stores: [checked, nameStore, required, disabled, value],
    returned: ([$checked, $name, $required, $disabled, $value]) => {
      return {
        type: "checkbox",
        "aria-hidden": true,
        hidden: true,
        tabindex: -1,
        name: $name,
        value: $value,
        checked: $checked,
        required: $required,
        disabled: disabledAttr($disabled),
        style: styleToString({
          position: "absolute",
          opacity: 0,
          "pointer-events": "none",
          margin: 0,
          transform: "translateX(-100%)"
        })
      };
    }
  });
  return {
    elements: {
      root,
      input
    },
    states: {
      checked
    },
    options
  };
}
function createBitAttrs(bit, parts) {
  const attrs = {};
  parts.forEach((part) => {
    attrs[part] = {
      [`data-${bit}-${part}`]: ""
    };
  });
  return (part) => attrs[part];
}
function createDispatcher() {
  const dispatch = createEventDispatcher();
  return (e) => {
    const { originalEvent } = e.detail;
    const { cancelable } = e;
    const type = originalEvent.type;
    const shouldContinue = dispatch(type, { originalEvent, currentTarget: originalEvent.currentTarget }, { cancelable });
    if (!shouldContinue) {
      e.preventDefault();
    }
  };
}
function removeUndefined(obj) {
  const result = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== void 0) {
      result[key] = value;
    }
  }
  return result;
}
function getOptionUpdater(options) {
  return function(key, value) {
    if (value === void 0)
      return;
    const store = options[key];
    if (store) {
      store.set(value);
    }
  };
}
function getSwitchData() {
  const NAME = "switch";
  const PARTS = ["root", "input", "thumb"];
  return {
    NAME,
    PARTS
  };
}
function setCtx(props) {
  const { NAME, PARTS } = getSwitchData();
  const getAttrs = createBitAttrs(NAME, PARTS);
  const Switch2 = { ...createSwitch(removeUndefined(props)), getAttrs };
  setContext(NAME, Switch2);
  return {
    ...Switch2,
    updateOption: getOptionUpdater(Switch2.options)
  };
}
function getCtx() {
  const { NAME } = getSwitchData();
  return getContext(NAME);
}
const Switch_input = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let inputValue;
  let $$restProps = compute_rest_props($$props, ["el"]);
  let $value, $$unsubscribe_value;
  let $input, $$unsubscribe_input;
  let $name, $$unsubscribe_name;
  let $disabled, $$unsubscribe_disabled;
  let $required, $$unsubscribe_required;
  let { el = void 0 } = $$props;
  const { elements: { input }, options: { value, name: name2, disabled, required } } = getCtx();
  $$unsubscribe_input = subscribe(input, (value2) => $input = value2);
  $$unsubscribe_value = subscribe(value, (value2) => $value = value2);
  $$unsubscribe_name = subscribe(name2, (value2) => $name = value2);
  $$unsubscribe_disabled = subscribe(disabled, (value2) => $disabled = value2);
  $$unsubscribe_required = subscribe(required, (value2) => $required = value2);
  if ($$props.el === void 0 && $$bindings.el && el !== void 0) $$bindings.el(el);
  inputValue = $value === void 0 || $value === "" ? "on" : $value;
  $$unsubscribe_value();
  $$unsubscribe_input();
  $$unsubscribe_name();
  $$unsubscribe_disabled();
  $$unsubscribe_required();
  return `<input${spread(
    [
      escape_object($input),
      { name: escape_attribute_value($name) },
      { disabled: $disabled || null },
      { required: $required || null },
      {
        value: escape_attribute_value(inputValue)
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", el, 0)}>`;
});
const { Object: Object_1 } = globals;
const Switch$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let attrs;
  let $$restProps = compute_rest_props($$props, [
    "checked",
    "onCheckedChange",
    "disabled",
    "name",
    "value",
    "includeInput",
    "required",
    "asChild",
    "inputAttrs",
    "el"
  ]);
  let $root, $$unsubscribe_root;
  let { checked = void 0 } = $$props;
  let { onCheckedChange = void 0 } = $$props;
  let { disabled = void 0 } = $$props;
  let { name: name2 = void 0 } = $$props;
  let { value = void 0 } = $$props;
  let { includeInput = true } = $$props;
  let { required = void 0 } = $$props;
  let { asChild = false } = $$props;
  let { inputAttrs = void 0 } = $$props;
  let { el = void 0 } = $$props;
  const { elements: { root }, states: { checked: localChecked }, updateOption, getAttrs } = setCtx({
    disabled,
    name: name2,
    value,
    required,
    defaultChecked: checked,
    onCheckedChange: ({ next }) => {
      if (checked !== next) {
        onCheckedChange?.(next);
        checked = next;
      }
      return next;
    }
  });
  $$unsubscribe_root = subscribe(root, (value2) => $root = value2);
  createDispatcher();
  if ($$props.checked === void 0 && $$bindings.checked && checked !== void 0) $$bindings.checked(checked);
  if ($$props.onCheckedChange === void 0 && $$bindings.onCheckedChange && onCheckedChange !== void 0) $$bindings.onCheckedChange(onCheckedChange);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0) $$bindings.disabled(disabled);
  if ($$props.name === void 0 && $$bindings.name && name2 !== void 0) $$bindings.name(name2);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  if ($$props.includeInput === void 0 && $$bindings.includeInput && includeInput !== void 0) $$bindings.includeInput(includeInput);
  if ($$props.required === void 0 && $$bindings.required && required !== void 0) $$bindings.required(required);
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0) $$bindings.asChild(asChild);
  if ($$props.inputAttrs === void 0 && $$bindings.inputAttrs && inputAttrs !== void 0) $$bindings.inputAttrs(inputAttrs);
  if ($$props.el === void 0 && $$bindings.el && el !== void 0) $$bindings.el(el);
  checked !== void 0 && localChecked.set(checked);
  {
    updateOption("disabled", disabled);
  }
  {
    updateOption("name", name2);
  }
  {
    updateOption("value", value);
  }
  {
    updateOption("required", required);
  }
  builder = $root;
  attrs = {
    ...getAttrs("root"),
    "data-checked": checked ? "" : void 0
  };
  {
    Object.assign(builder, attrs);
  }
  $$unsubscribe_root();
  return `${asChild ? `${slots.default ? slots.default({ builder }) : ``}` : `<button${spread([escape_object(builder), { type: "button" }, escape_object($$restProps)], {})}${add_attribute("this", el, 0)}>${slots.default ? slots.default({ builder }) : ``}</button>`} ${includeInput ? `${validate_component(Switch_input, "SwitchInput").$$render($$result, Object_1.assign({}, inputAttrs), {}, {})}` : ``}`;
});
const Switch_thumb = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let attrs;
  let $$restProps = compute_rest_props($$props, ["asChild", "el"]);
  let $checked, $$unsubscribe_checked;
  let { asChild = false } = $$props;
  let { el = void 0 } = $$props;
  const { states: { checked }, getAttrs } = getCtx();
  $$unsubscribe_checked = subscribe(checked, (value) => $checked = value);
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0) $$bindings.asChild(asChild);
  if ($$props.el === void 0 && $$bindings.el && el !== void 0) $$bindings.el(el);
  attrs = {
    ...getAttrs("thumb"),
    "data-state": $checked ? "checked" : "unchecked",
    "data-checked": $checked ? "" : void 0
  };
  $$unsubscribe_checked();
  return `${asChild ? `${slots.default ? slots.default({ attrs, checked: $checked }) : ``}` : `<span${spread([escape_object($$restProps), escape_object(attrs)], {})}${add_attribute("this", el, 0)}></span>`}`;
});
const Activity = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "activity" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Arrow_left = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "m12 19-7-7 7-7" }], ["path", { "d": "M19 12H5" }]];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "arrow-left" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Arrow_right = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "m12 5 7 7-7 7" }]];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "arrow-right" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Badge_check = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
      }
    ],
    ["path", { "d": "m9 12 2 2 4-4" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "badge-check" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Bell_ring = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
      }
    ],
    ["path", { "d": "M10.3 21a1.94 1.94 0 0 0 3.4 0" }],
    ["path", { "d": "M4 2C2.8 3.7 2 5.7 2 8" }],
    ["path", { "d": "M22 8c0-2.3-.8-4.3-2-6" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "bell-ring" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Box = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
      }
    ],
    ["path", { "d": "m3.3 7 8.7 5 8.7-5" }],
    ["path", { "d": "M12 22V12" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "box" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Calendar_clock = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"
      }
    ],
    ["path", { "d": "M16 2v4" }],
    ["path", { "d": "M8 2v4" }],
    ["path", { "d": "M3 10h5" }],
    ["path", { "d": "M17.5 17.5 16 16.3V14" }],
    ["circle", { "cx": "16", "cy": "16", "r": "6" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "calendar-clock" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Camera = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
      }
    ],
    ["circle", { "cx": "12", "cy": "13", "r": "3" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "camera" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Check = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "M20 6 9 17l-5-5" }]];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "check" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Clock = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["polyline", { "points": "12 6 12 12 16 14" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "clock" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const File_text = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
      }
    ],
    ["path", { "d": "M14 2v4a2 2 0 0 0 2 2h4" }],
    ["path", { "d": "M10 9H8" }],
    ["path", { "d": "M16 13H8" }],
    ["path", { "d": "M16 17H8" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "file-text" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Globe = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    [
      "path",
      {
        "d": "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"
      }
    ],
    ["path", { "d": "M2 12h20" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "globe" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Link = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
      }
    ],
    [
      "path",
      {
        "d": "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "link" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Mail = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "rect",
      {
        "width": "20",
        "height": "16",
        "x": "2",
        "y": "4",
        "rx": "2"
      }
    ],
    [
      "path",
      {
        "d": "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "mail" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Message_square = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "message-square" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Package = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "m7.5 4.27 9 5.15" }],
    [
      "path",
      {
        "d": "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
      }
    ],
    ["path", { "d": "m3.3 7 8.7 5 8.7-5" }],
    ["path", { "d": "M12 22V12" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "package" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Receipt = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"
      }
    ],
    [
      "path",
      {
        "d": "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"
      }
    ],
    ["path", { "d": "M12 17.5v-11" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "receipt" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Refresh_ccw = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
      }
    ],
    ["path", { "d": "M3 3v5h5" }],
    [
      "path",
      {
        "d": "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"
      }
    ],
    ["path", { "d": "M16 16h5v5" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "refresh-ccw" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Shield_check = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
      }
    ],
    ["path", { "d": "m9 12 2 2 4-4" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "shield-check" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Smartphone = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "rect",
      {
        "width": "14",
        "height": "20",
        "x": "5",
        "y": "2",
        "rx": "2",
        "ry": "2"
      }
    ],
    ["path", { "d": "M12 18h.01" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "smartphone" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Star = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "polygon",
      {
        "points": "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "star" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Store = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"
      }
    ],
    [
      "path",
      {
        "d": "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
      }
    ],
    [
      "path",
      {
        "d": "M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"
      }
    ],
    ["path", { "d": "M2 7h20" }],
    [
      "path",
      {
        "d": "M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "store" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Trending_up = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["polyline", { "points": "22 7 13.5 15.5 8.5 10.5 2 17" }],
    ["polyline", { "points": "16 7 22 7 22 13" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "trending-up" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Wrench = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      }
    ]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "wrench" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
let seo = {
  title: "Behar Tech Pro — Le logiciel premium pour ateliers de réparation",
  description: "Behar Tech Pro centralise votre atelier de réparation : suivi client, QR code, devis & factures, reconditionnement et encaissement dans un seul outil.",
  image: "https://i.pinimg.com/736x/85/9a/92/859a92a2629f912010a0a72270aefedc.jpg",
  twitter: "Behar Tech Pro",
  url: "https://startup-sve.vercel.app",
  keywords: "logiciel réparation, atelier réparation, suivi client, devis facture, reconditionnement, QR code, SAV smartphone"
};
const ICONS = {
  activity: Activity,
  badgeCheck: Badge_check,
  bellRing: Bell_ring,
  box: Box,
  calendarClock: Calendar_clock,
  camera: Camera,
  check: Check,
  clock: Clock,
  fileText: File_text,
  globe: Globe,
  link: Link,
  mail: Mail,
  messageSquare: Message_square,
  package: Package,
  receipt: Receipt,
  refreshCcw: Refresh_ccw,
  shieldCheck: Shield_check,
  smartphone: Smartphone,
  sparkles: Sparkles,
  star: Star,
  store: Store,
  trendingUp: Trending_up,
  wrench: Wrench
};
function resolveIcon(name2) {
  return name2 && ICONS[name2] || Check;
}
const ClientSection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let stats;
  let items;
  let $cms, $$unsubscribe_cms;
  const cms = getCms();
  $$unsubscribe_cms = subscribe(cms, (value) => $cms = value);
  stats = $cms.stats;
  items = stats.items.filter((s) => s.visible !== false);
  $$unsubscribe_cms();
  return `<section id="clients" class="scroll-mt-28 px-6 py-24 md:px-8 md:py-28"><div class="mx-auto max-w-6xl"><div class="text-center"><p class="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">${escape(stats.kicker)}</p> <p class="mx-auto mt-4 max-w-2xl text-lg" style="color: var(--bt-muted)">${escape(stats.subtitle)}</p></div> <div class="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8 lg:gap-y-0">${each(items, (stat) => {
    return `<div class="flex flex-col items-center gap-2 px-4 text-center"><div class="flex items-center gap-2">${stat.icon === "globe" ? `${validate_component(Globe, "Globe").$$render(
      $$result,
      {
        class: "size-6",
        style: "color: var(--bt-accent)",
        strokeWidth: 1.8
      },
      {},
      {}
    )}` : `${stat.icon === "google" ? `<svg viewBox="0 0 48 48" class="size-6" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path></svg>` : `${stat.icon ? `${validate_component(resolveIcon(stat.icon) || missing_component, "svelte:component").$$render(
      $$result,
      {
        class: "size-6",
        style: "color: var(--bt-accent)",
        strokeWidth: 1.8
      },
      {},
      {}
    )}` : ``}`}`} <span class="text-3xl font-bold tracking-tight md:text-4xl" style="color: var(--bt-text)">${escape(stat.value)} </span></div> <span class="text-sm" style="color: var(--bt-muted)">${escape(stat.label)}</span> </div>`;
  })}</div></div></section>`;
});
const CtaSection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let integrations;
  let items;
  let $cms, $$unsubscribe_cms;
  const cms = getCms();
  $$unsubscribe_cms = subscribe(cms, (value) => $cms = value);
  integrations = $cms.integrations;
  items = integrations.items.filter((l) => l.visible !== false);
  $$unsubscribe_cms();
  return `<section id="cta" class="relative scroll-mt-28 overflow-hidden px-6 pb-24 pt-32 md:px-8"> <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[360px] max-w-5xl" style="background: radial-gradient(70% 60% at 50% 0%, rgba(255,214,186,0.7), transparent 66%);"></div> <div class="mx-auto max-w-6xl"><div class="mx-auto max-w-3xl text-center"><p class="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">${escape(integrations.kicker)}</p> <h2 class="mt-4 text-4xl font-bold tracking-tight sm:text-5xl" style="color: var(--bt-text)">${escape(integrations.titleStrong)} <span class="font-normal text-gray-500">${escape(integrations.titleMuted)}</span></h2> <p class="mx-auto mt-5 max-w-2xl text-lg text-gray-500">${escape(integrations.subtitle)}</p></div> <div class="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">${each(items, (l) => {
    return `<div class="flex flex-col items-center gap-3 text-center"><img${add_attribute("src", l.logo, 0)}${add_attribute("alt", l.name, 0)} loading="lazy" class="h-12 w-auto object-contain"> <div><p class="font-semibold" style="${"color: " + escape(l.color || "var(--bt-text)", true)}">${escape(l.name)}</p> <p class="mt-1 text-sm text-gray-500">${escape(l.desc)}</p></div> </div>`;
  })}</div></div></section>`;
});
const HeroSection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let hero;
  let subtitleLines;
  let $cms, $$unsubscribe_cms;
  const cms = getCms();
  $$unsubscribe_cms = subscribe(cms, (value) => $cms = value);
  hero = $cms.hero;
  subtitleLines = hero.subtitle.split("\n");
  $$unsubscribe_cms();
  return `<section id="hero" class="relative isolate flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-6 py-28 text-center md:px-8"> <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 mx-auto max-w-5xl" style="background: radial-gradient(58% 48% at 50% 44%, rgba(255,214,186,0.85), transparent 70%);"></div> ${hero.badge ? `<a href="#pense" class="-translate-y-4 animate-fade-in inline-flex items-center gap-1.5 rounded-full border border-[rgba(26,25,22,0.08)] bg-white/70 px-4 py-1.5 text-sm text-gray-500 opacity-0 shadow-sm backdrop-blur transition hover:text-gray-700">${escape(hero.badge)} ${validate_component(Arrow_right, "ArrowRightIcon").$$render($$result, { class: "size-3.5" }, {}, {})}</a>` : ``} <h1 class="-translate-y-4 animate-fade-in mt-6 max-w-4xl text-balance py-2 text-6xl font-medium leading-[1.02] tracking-tighter opacity-0 [--animation-delay:150ms] md:text-7xl lg:text-8xl" style="color: var(--bt-text)">${escape(hero.title)}</h1> <p class="-translate-y-4 animate-fade-in mt-6 max-w-2xl text-balance text-lg text-gray-500 opacity-0 [--animation-delay:300ms] md:text-xl">${each(subtitleLines, (line, i) => {
    return `${i > 0 ? `<br class="hidden md:block">` : ``} ${escape(line)}`;
  })}</p> ${hero.ctaLabel ? `<a${add_attribute("href", hero.ctaHref, 0)} class="-translate-y-4 animate-fade-in mt-8 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white opacity-0 shadow-sm transition hover:opacity-90 [--animation-delay:450ms]" style="background: var(--bt-button)">${escape(hero.ctaLabel)} ${validate_component(Arrow_right, "ArrowRightIcon").$$render($$result, { class: "size-4" }, {}, {})}</a>` : ``} ${hero.showImage && hero.image ? `<div class="relative mt-16 w-full max-w-[1200px] animate-fade-up opacity-0 [--animation-delay:400ms] md:mt-20"><img${add_attribute("src", hero.image, 0)} alt="Aperçu Behar Tech Pro" loading="lazy" class="relative w-full rounded-2xl border border-[rgba(26,25,22,0.08)]" style="box-shadow: var(--bt-shadow)"> <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-0 h-28" style="background: linear-gradient(to top, var(--bt-bg), transparent);"></div></div>` : ``}</section>`;
});
const Switch = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "checked"]);
  let { class: className = void 0 } = $$props;
  let { checked = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  if ($$props.checked === void 0 && $$bindings.checked && checked !== void 0) $$bindings.checked(checked);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `${validate_component(Switch$1, "SwitchPrimitive.Root").$$render(
      $$result,
      Object.assign(
        {},
        {
          class: cn("focus-visible:ring-ring focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)
        },
        $$restProps,
        { checked }
      ),
      {
        checked: ($$value) => {
          checked = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${validate_component(Switch_thumb, "SwitchPrimitive.Thumb").$$render(
            $$result,
            {
              class: cn("bg-background pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0")
            },
            {},
            {}
          )}`;
        }
      }
    )}`;
  } while (!$$settled);
  return $$rendered;
});
function toHumanPrice(price, decimals = 0) {
  return Number(price / 100).toFixed(decimals);
}
const PricingSection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let pricing;
  let plans;
  let $cms, $$unsubscribe_cms;
  const cms = getCms();
  $$unsubscribe_cms = subscribe(cms, (value) => $cms = value);
  pricing = $cms.pricing;
  plans = pricing.plans.filter((p) => p.visible !== false);
  $$unsubscribe_cms();
  return `<section id="pricing" class="scroll-mt-28"><div class="mx-auto flex max-w-screen-xl flex-col gap-8 px-4 py-14 md:px-8"><div class="mx-auto max-w-5xl text-center"><h4 class="text-xl font-bold tracking-tight" style="color: var(--bt-text)">${escape(pricing.kicker)}</h4> <h2 class="text-5xl font-bold tracking-tight sm:text-6xl" style="color: var(--bt-text)">${escape(pricing.title)}</h2> <p class="mt-6 text-xl leading-8" style="color: var(--bt-muted)">${escape(pricing.subtitle)}</p></div> <div class="flex w-full items-center justify-center space-x-2">${validate_component(Switch, "Switch").$$render($$result, { id: "interval" }, {}, {})} <span data-svelte-h="svelte-r27nzt">Annuel</span> ${pricing.intervalNote ? `<span class="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase leading-5 tracking-wide text-white" style="background: var(--bt-text)">${escape(pricing.intervalNote)}</span>` : ``}</div> <div class="mx-auto grid w-full flex-col justify-center gap-4 sm:grid-cols-2 lg:grid-cols-4">${each(plans, (price, id) => {
    return `<div${add_attribute("class", cn("relative flex max-w-[400px] flex-col gap-8 overflow-hidden border p-4", price.isMostPopular ? "border-2" : ""), 0)} style="${"color: var(--bt-text); border-radius: var(--bt-radius); background: var(--bt-card); " + escape(
      price.isMostPopular ? "border-color: var(--bt-accent);" : "",
      true
    )}"><div class="flex items-center"><div class="ml-4"><h2 class="text-base font-semibold leading-7">${escape(price.name)}</h2> <p class="h-12 text-sm leading-5" style="color: var(--bt-muted)">${escape(price.description)}</p> </div></div> <div class="flex flex-row gap-1"><span class="text-4xl font-bold" style="color: var(--bt-text)">${escape(
      toHumanPrice(price.monthlyPrice)
    )}€
								<span class="text-xs">${escape("/ mois")}</span></span> </div> ${validate_component(Button, "Button").$$render(
      $$result,
      {
        href: price.buttonHref,
        class: "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter"
      },
      {},
      {
        default: () => {
          return `${escape(price.buttonText)} `;
        }
      }
    )} <hr class="m-0 h-px w-full border-none bg-gradient-to-r from-neutral-200/0 via-neutral-500/30 to-neutral-200/0"> ${price.features && price.features.length > 0 ? `<ul class="flex flex-col gap-2 font-normal">${each(price.features, (feature) => {
      return `<li class="flex items-center gap-3 text-xs font-medium" style="color: var(--bt-text)">${validate_component(Check, "CheckIcon").$$render(
        $$result,
        {
          class: "size-5 shrink-0 rounded-full p-[2px] text-white",
          style: "background: var(--bt-accent)"
        },
        {},
        {}
      )} <span class="flex">${escape(feature)}</span> </li>`;
    })} </ul>` : ``} </div>`;
  })}</div>  ${pricing.setup.visible !== false ? `<div class="mx-auto w-full max-w-[860px]"><div class="flex flex-col gap-6 overflow-hidden border p-6 sm:flex-row sm:items-center sm:justify-between" style="color: var(--bt-text); border-radius: var(--bt-radius); background: var(--bt-card)"><div class="flex flex-col gap-3"><div><h2 class="text-base font-semibold leading-7">${escape(pricing.setup.name)}</h2> <p class="text-sm leading-5" style="color: var(--bt-muted)">${escape(pricing.setup.description)}</p></div> <ul class="flex flex-wrap gap-x-5 gap-y-2">${each(pricing.setup.features, (feature) => {
    return `<li class="flex items-center gap-2 text-xs font-medium" style="color: var(--bt-text)">${validate_component(Check, "CheckIcon").$$render(
      $$result,
      {
        class: "size-5 shrink-0 rounded-full p-[2px] text-white",
        style: "background: var(--bt-accent)"
      },
      {},
      {}
    )} <span class="flex">${escape(feature)}</span> </li>`;
  })}</ul></div> <div class="flex shrink-0 flex-col items-start gap-2 sm:items-end"><span class="text-4xl font-bold" style="color: var(--bt-text)">${escape(pricing.setup.price)}</span> <span class="text-xs" style="color: var(--bt-muted)">${escape(pricing.setup.note)}</span> ${validate_component(Button, "Button").$$render(
    $$result,
    {
      href: pricing.setup.buttonHref,
      class: "group relative gap-2 overflow-hidden text-lg font-semibold tracking-tighter"
    },
    {},
    {
      default: () => {
        return `${escape(pricing.setup.buttonText)}`;
      }
    }
  )}</div></div></div>` : ``}</div></section>`;
});
const teal = "var(--bt-accent)";
const ShowcaseCarousel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let slides;
  let count;
  let slide;
  let leftTitle;
  let cards;
  let { config } = $$props;
  let active = 0;
  if ($$props.config === void 0 && $$bindings.config && config !== void 0) $$bindings.config(config);
  slides = config.slides.filter((s) => s.visible !== false);
  count = slides.length;
  active = Math.min(active, Math.max(0, count - 1));
  slide = slides[active] ?? slides[0];
  leftTitle = config.sideTitle || slide?.sideTitle || "";
  cards = (slide?.cards ?? []).filter((c) => c.visible !== false);
  return `<section class="relative scroll-mt-24 overflow-hidden px-5 py-24 md:py-28" tabindex="0" role="group" aria-roledescription="carrousel"><div class="mx-auto max-w-[1520px]"> <div class="mx-auto max-w-3xl text-center"><h2 class="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-black sm:text-5xl md:text-6xl">${each(config.titleLines, (line) => {
    return `<span class="block">${escape(line)}</span>`;
  })}</h2> ${config.subtitle ? `<p class="mx-auto mt-5 max-w-2xl text-lg text-gray-500">${escape(config.subtitle)}</p>` : ``} ${config.subtitleTeal ? `<p class="mt-4 text-lg font-semibold" style="${"color:" + escape(teal, true)}">${escape(config.subtitleTeal)}</p>` : ``} ${config.description ? `<p class="mx-auto mt-3 max-w-2xl text-lg text-gray-500">${escape(config.description)}</p>` : ``}</div>  <div class="mt-16 grid grid-cols-1 items-center gap-8 lg:[grid-template-columns:280px_minmax(0,1fr)_300px] lg:gap-[clamp(2rem,4vw,4.5rem)]"> <div class="order-2 lg:order-1"><div class="mx-auto max-w-sm lg:mx-0"><h3 class="text-lg font-bold" style="${"color:" + escape(teal, true)}">${escape(leftTitle)}</h3> <ul class="mt-5 flex flex-col gap-4">${each(slide.bullets, (b) => {
    return `<li class="flex items-start gap-3 text-sm text-black"><span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full" style="${"background:" + escape(teal, true)}">${validate_component(Check, "CheckIcon").$$render(
      $$result,
      {
        class: "size-3 text-white",
        strokeWidth: 3
      },
      {},
      {}
    )}</span> <span>${escape(b)}</span> </li>`;
  })}</ul></div></div>  <div class="relative order-1 lg:order-2"><button aria-label="Précédent" class="absolute -left-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-md transition hover:text-[#2A9D8F] sm:-left-9 lg:-left-14">${validate_component(Arrow_left, "ArrowLeftIcon").$$render($$result, { class: "size-5" }, {}, {})}</button> <button aria-label="Suivant" class="absolute -right-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-md transition hover:text-[#2A9D8F] sm:-right-9 lg:-right-14">${validate_component(Arrow_right, "ArrowRightIcon").$$render($$result, { class: "size-5" }, {}, {})}</button> <div><div>${config.layout === "phone" ? ` <div class="relative mx-auto flex max-w-[260px] justify-center lg:max-w-none"><img${add_attribute("src", slide.img, 0)}${add_attribute("alt", slide.tab, 0)} class="relative z-10 h-[420px] w-auto object-contain lg:h-[560px]" style="filter: var(--bt-shadow-float);">  <div class="absolute inset-0 z-20 hidden lg:block">${each(cards, (c, i) => {
    return `<div class="${"absolute w-40 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.18)] " + escape(
      i === 0 ? "-left-3 top-6" : i === 1 ? "-left-3 bottom-6" : i === 2 ? "-right-3 top-6" : "-right-3 bottom-6",
      true
    )}">${validate_component(resolveIcon(c.icon) || missing_component, "svelte:component").$$render($$result, { class: "size-4", style: "color:" + teal }, {}, {})} <p class="mt-1.5 text-xs font-semibold text-black">${escape(c.title)}</p> <p class="mt-0.5 text-[11px] leading-snug text-gray-500">${escape(c.text)}</p> </div>`;
  })}</div></div> <div class="mt-6 grid grid-cols-2 gap-3 lg:hidden">${each(cards, (c) => {
    return `<div class="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">${validate_component(resolveIcon(c.icon) || missing_component, "svelte:component").$$render($$result, { class: "size-4", style: "color:" + teal }, {}, {})} <p class="mt-1.5 text-xs font-semibold text-black">${escape(c.title)}</p> <p class="text-[11px] leading-snug text-gray-500">${escape(c.text)}</p> </div>`;
  })}</div>` : `${slide.device ? ` <div class="flex h-[300px] items-center justify-center sm:h-[460px] lg:h-[580px]"><img${add_attribute("src", slide.img, 0)}${add_attribute("alt", slide.tab, 0)} class="max-h-full w-auto max-w-full object-contain" style="filter: var(--bt-shadow-float);"></div>` : ` <div class="mx-auto flex min-h-[300px] items-center justify-center sm:min-h-[460px] lg:min-h-[580px]"><div class="w-full max-w-[820px] overflow-hidden border bg-white" style="border-radius: var(--bt-radius); border-color: rgba(26,25,22,0.08); box-shadow: var(--bt-shadow);"><img${add_attribute("src", slide.img, 0)}${add_attribute("alt", slide.tab, 0)} class="block h-auto w-full"></div></div>`}`}</div></div></div>  <div class="order-3"><ul class="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">${each(slides, (s, i) => {
    return `<li class="shrink-0 lg:w-full"><button class="flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl border px-4 py-3 text-left text-sm transition"${add_attribute(
      "style",
      i === active && config.tabStyle === "filled" ? `background:${teal};border-color:${teal};color:#fff` : i === active ? `border-color:${teal};color:#000;background:#fff` : "border-color:#e5e7eb;color:#6b7280;background:#fff",
      0
    )}>${config.tabStyle === "dots" ? `<span class="size-2 shrink-0 rounded-full" style="${"background:" + escape(i === active ? teal : "#d1d5db", true)}"></span>` : `${s.tabIcon ? `${validate_component(resolveIcon(s.tabIcon) || missing_component, "svelte:component").$$render($$result, { class: "size-4 shrink-0" }, {}, {})}` : ``}`} <span${add_attribute("class", i === active ? "font-semibold" : "", 0)}>${escape(s.tab)}</span></button> </li>`;
  })}</ul></div></div>  <div class="mt-10 flex items-center justify-center gap-2">${each(slides, (_, i) => {
    return `<button${add_attribute("aria-label", `Vue ${i + 1}`, 0)} class="h-2 rounded-full transition-all" style="${"width:" + escape(i === active ? "24px" : "8px", true) + ";background:" + escape(i === active ? teal : "#d1d5db", true)}"></button>`;
  })}</div></div></section>`;
});
const SphereMask = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { reverse = false } = $$props;
  if ($$props.reverse === void 0 && $$bindings.reverse && reverse !== void 0) $$bindings.reverse(reverse);
  return `<div${add_attribute(
    "class",
    cn(
      // color
      "[--color:var(--color-one)]",
      "pointer-events-none relative  mx-auto h-[50rem] overflow-hidden",
      // sphere mask
      "[mask-image:radial-gradient(ellipse_at_center_center,#000,transparent_50%)]",
      // reverse
      reverse ? "my-[-22rem] rotate-180 md:mt-[-30rem]" : "my-[-18.8rem]",
      // before
      "before:absolute before:inset-0 before:size-full before:opacity-40 before:[background-image:radial-gradient(circle_at_bottom_center,var(--color),transparent_70%)]",
      // after
      "after:absolute after:-left-1/2 after:top-1/2 after:aspect-[1/0.7] after:w-[200%] after:rounded-[50%] after:border-t after:border-[hsl(var(--border))] after:bg-background"
    ),
    0
  )}></div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let content;
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  content = data.content;
  return `${$$result.head += `<!-- HEAD_svelte-1d2z2zj_START -->${$$result.title = `<title>${escape(content.seo.title || seo.title)}</title>`, ""}<meta name="description"${add_attribute("content", content.seo.description, 0)}><meta name="keywords"${add_attribute("content", content.seo.keywords, 0)}><meta property="og:title"${add_attribute("content", content.seo.title, 0)}><meta property="og:description"${add_attribute("content", content.seo.description, 0)}><meta property="og:image"${add_attribute("content", content.seo.image, 0)}><meta property="og:site_name"${add_attribute("content", content.seo.title, 0)}><meta property="og:url"${add_attribute("content", content.seo.url, 0)}><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"${add_attribute("content", content.seo.title, 0)}><meta name="twitter:description"${add_attribute("content", content.seo.description, 0)}><meta name="twitter:image"${add_attribute("content", content.seo.image, 0)}><!-- HEAD_svelte-1d2z2zj_END -->`, ""} ${each(content.sections, (section) => {
    return `${section.visible ? `${section.id === "hero" ? `${validate_component(HeroSection, "HeroSection").$$render($$result, {}, {}, {})}` : `${section.id === "stats" ? `${validate_component(ClientSection, "ClientSection").$$render($$result, {}, {}, {})}` : `${section.id === "showcaseA" ? `${validate_component(SphereMask, "SphereMask").$$render($$result, {}, {}, {})} ${validate_component(ShowcaseCarousel, "ShowcaseCarousel").$$render($$result, { config: content.showcases.A }, {}, {})}` : `${section.id === "showcaseB" ? `${validate_component(ShowcaseCarousel, "ShowcaseCarousel").$$render($$result, { config: content.showcases.B }, {}, {})}` : `${section.id === "showcaseC" ? `${validate_component(ShowcaseCarousel, "ShowcaseCarousel").$$render($$result, { config: content.showcases.C }, {}, {})}` : `${section.id === "integrations" ? `${validate_component(CtaSection, "CtaSection").$$render($$result, {}, {}, {})}` : `${section.id === "pricing" ? `${validate_component(PricingSection, "PricingSection").$$render($$result, {}, {}, {})}` : ``}`}`}`}`}`}`}` : ``}`;
  })}`;
});
export {
  Page as default
};
