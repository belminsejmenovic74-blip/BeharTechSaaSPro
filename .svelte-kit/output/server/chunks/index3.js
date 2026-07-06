import { c as create_ssr_component, v as validate_component, s as spread, h as escape_object, a as add_attribute, b as each, e as escape, g as escape_attribute_value } from "./ssr.js";
import { I as Icon } from "./Icon.js";
import { s as setContext, h as hasContext, d as getContext, a as subscribe, n as noop, c as compute_rest_props } from "./lifecycle.js";
import { c as cn, B as Button } from "./button.js";
import { w as writable } from "./index2.js";
import { nanoid } from "nanoid/non-secure";
import "clsx";
import "dequal";
const Chevron_left = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "m15 18-6-6 6-6" }]];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "chevron-left" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Loader = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["path", { "d": "M12 2v4" }],
    ["path", { "d": "m16.2 7.8 2.9-2.9" }],
    ["path", { "d": "M18 12h4" }],
    ["path", { "d": "m16.2 16.2 2.9 2.9" }],
    ["path", { "d": "M12 18v4" }],
    ["path", { "d": "m4.9 19.1 2.9-2.9" }],
    ["path", { "d": "M2 12h4" }],
    ["path", { "d": "m4.9 4.9 2.9 2.9" }]
  ];
  return `${validate_component(Icon, "Icon").$$render($$result, Object.assign({}, { name: "loader" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const GitHubSvg = "data:image/svg+xml,%3csvg%20viewBox='0%200%20256%20250'%20width='256'%20height='250'%20fill='%23fff'%20xmlns='http://www.w3.org/2000/svg'%20preserveAspectRatio='xMidYMid'%20%3e%3cpath%20d='M128.001%200C57.317%200%200%2057.307%200%20128.001c0%2056.554%2036.676%20104.535%2087.535%20121.46%206.397%201.185%208.746-2.777%208.746-6.158%200-3.052-.12-13.135-.174-23.83-35.61%207.742-43.124-15.103-43.124-15.103-5.823-14.795-14.213-18.73-14.213-18.73-11.613-7.944.876-7.78.876-7.78%2012.853.902%2019.621%2013.19%2019.621%2013.19%2011.417%2019.568%2029.945%2013.911%2037.249%2010.64%201.149-8.272%204.466-13.92%208.127-17.116-28.431-3.236-58.318-14.212-58.318-63.258%200-13.975%205-25.394%2013.188-34.358-1.329-3.224-5.71-16.242%201.24-33.874%200%200%2010.749-3.44%2035.21%2013.121%2010.21-2.836%2021.16-4.258%2032.038-4.307%2010.878.049%2021.837%201.47%2032.066%204.307%2024.431-16.56%2035.165-13.12%2035.165-13.12%206.967%2017.63%202.584%2030.65%201.255%2033.873%208.207%208.964%2013.173%2020.383%2013.173%2034.358%200%2049.163-29.944%2059.988-58.447%2063.157%204.591%203.972%208.682%2011.762%208.682%2023.704%200%2017.126-.148%2030.91-.148%2035.126%200%203.407%202.304%207.398%208.792%206.14C219.37%20232.5%20256%20184.537%20256%20128.002%20256%2057.307%20198.691%200%20128.001%200Zm-80.06%20182.34c-.282.636-1.283.827-2.194.39-.929-.417-1.45-1.284-1.15-1.922.276-.655%201.279-.838%202.205-.399.93.418%201.46%201.293%201.139%201.931Zm6.296%205.618c-.61.566-1.804.303-2.614-.591-.837-.892-.994-2.086-.375-2.66.63-.566%201.787-.301%202.626.591.838.903%201%202.088.363%202.66Zm4.32%207.188c-.785.545-2.067.034-2.86-1.104-.784-1.138-.784-2.503.017-3.05.795-.547%202.058-.055%202.861%201.075.782%201.157.782%202.522-.019%203.08Zm7.304%208.325c-.701.774-2.196.566-3.29-.49-1.119-1.032-1.43-2.496-.726-3.27.71-.776%202.213-.558%203.315.49%201.11%201.03%201.45%202.505.701%203.27Zm9.442%202.81c-.31%201.003-1.75%201.459-3.199%201.033-1.448-.439-2.395-1.613-2.103-2.626.301-1.01%201.747-1.484%203.207-1.028%201.446.436%202.396%201.602%202.095%202.622Zm10.744%201.193c.036%201.055-1.193%201.93-2.715%201.95-1.53.034-2.769-.82-2.786-1.86%200-1.065%201.202-1.932%202.733-1.958%201.522-.03%202.768.818%202.768%201.868Zm10.555-.405c.182%201.03-.875%202.088-2.387%202.37-1.485.271-2.861-.365-3.05-1.386-.184-1.056.893-2.114%202.376-2.387%201.514-.263%202.868.356%203.061%201.403Z'%20/%3e%3c/svg%3e";
const FORM_FIELD = Symbol("FORM_FIELD_CTX");
function setFormField(props) {
  setContext(FORM_FIELD, props);
  return props;
}
function getFormField() {
  if (!hasContext(FORM_FIELD)) {
    ctxError("Form.Field");
  }
  return getContext(FORM_FIELD);
}
const FORM_CONTROL = Symbol("FORM_CONTROL_CTX");
function setFormControl(props) {
  setContext(FORM_CONTROL, props);
  return props;
}
function ctxError(ctx) {
  throw new Error(`Unable to find \`${ctx}\` context. Did you forget to wrap the component in a \`${ctx}\`?`);
}
function getAriaDescribedBy({ fieldErrorsId = void 0, descriptionId = void 0, errors }) {
  let describedBy = "";
  if (descriptionId) {
    describedBy += descriptionId + " ";
  }
  if (errors.length && fieldErrorsId) {
    describedBy += fieldErrorsId;
  }
  return describedBy ? describedBy.trim() : void 0;
}
function getAriaRequired(constraints) {
  if (!("required" in constraints))
    return void 0;
  return constraints.required ? "true" : void 0;
}
function getAriaInvalid(errors) {
  return errors && errors.length ? "true" : void 0;
}
function getDataFsError(errors) {
  return errors && errors.length ? "" : void 0;
}
function generateId() {
  return nanoid(5);
}
function extractErrorArray(errors) {
  if (Array.isArray(errors))
    return errors;
  if (typeof errors === "object" && "_errors" in errors) {
    if (errors._errors !== void 0)
      return errors._errors;
  }
  return [];
}
function getValueAtPath(path, obj) {
  const keys = path.split(/[[\].]/).filter(Boolean);
  let value = obj;
  for (const key of keys) {
    if (typeof value !== "object" || value === null) {
      return void 0;
    }
    value = value[key];
  }
  return value;
}
const Field = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let formErrors;
  let formConstraints;
  let formTainted;
  let formData;
  let $formTainted, $$unsubscribe_formTainted = noop, $$subscribe_formTainted = () => ($$unsubscribe_formTainted(), $$unsubscribe_formTainted = subscribe(formTainted, ($$value) => $formTainted = $$value), formTainted);
  let $formConstraints, $$unsubscribe_formConstraints = noop, $$subscribe_formConstraints = () => ($$unsubscribe_formConstraints(), $$unsubscribe_formConstraints = subscribe(formConstraints, ($$value) => $formConstraints = $$value), formConstraints);
  let $formErrors, $$unsubscribe_formErrors = noop, $$subscribe_formErrors = () => ($$unsubscribe_formErrors(), $$unsubscribe_formErrors = subscribe(formErrors, ($$value) => $formErrors = $$value), formErrors);
  let $formData, $$unsubscribe_formData = noop, $$subscribe_formData = () => ($$unsubscribe_formData(), $$unsubscribe_formData = subscribe(formData, ($$value) => $formData = $$value), formData);
  let $errors, $$unsubscribe_errors;
  let $tainted, $$unsubscribe_tainted;
  let { form } = $$props;
  let { name } = $$props;
  const field = {
    name: writable(name),
    errors: writable([]),
    constraints: writable({}),
    tainted: writable(false),
    fieldErrorsId: writable(),
    descriptionId: writable(),
    form
  };
  const { tainted, errors } = field;
  $$unsubscribe_tainted = subscribe(tainted, (value) => $tainted = value);
  $$unsubscribe_errors = subscribe(errors, (value) => $errors = value);
  setFormField(field);
  if ($$props.form === void 0 && $$bindings.form && form !== void 0) $$bindings.form(form);
  if ($$props.name === void 0 && $$bindings.name && name !== void 0) $$bindings.name(name);
  $$subscribe_formErrors({ errors: formErrors, constraints: formConstraints, tainted: formTainted, form: formData } = form, $$subscribe_formConstraints(), $$subscribe_formTainted(), $$subscribe_formData());
  {
    field.name.set(name);
  }
  {
    field.errors.set(extractErrorArray(getValueAtPath(name, $formErrors)));
  }
  {
    field.constraints.set(getValueAtPath(name, $formConstraints) ?? {});
  }
  {
    field.tainted.set($formTainted ? getValueAtPath(name, $formTainted) === true : false);
  }
  $$unsubscribe_formTainted();
  $$unsubscribe_formConstraints();
  $$unsubscribe_formErrors();
  $$unsubscribe_formData();
  $$unsubscribe_errors();
  $$unsubscribe_tainted();
  return ` ${slots.default ? slots.default({
    value: $formData[name],
    errors: $errors,
    tainted: $tainted,
    constraints: $formConstraints[name]
  }) : ``}`;
});
const Control$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let errorAttr;
  let attrs;
  let labelAttrs;
  let $idStore, $$unsubscribe_idStore;
  let $constraints, $$unsubscribe_constraints;
  let $errors, $$unsubscribe_errors;
  let $descriptionId, $$unsubscribe_descriptionId;
  let $fieldErrorsId, $$unsubscribe_fieldErrorsId;
  let $name, $$unsubscribe_name;
  let { id = generateId() } = $$props;
  const { name, fieldErrorsId, descriptionId, errors, constraints } = getFormField();
  $$unsubscribe_name = subscribe(name, (value) => $name = value);
  $$unsubscribe_fieldErrorsId = subscribe(fieldErrorsId, (value) => $fieldErrorsId = value);
  $$unsubscribe_descriptionId = subscribe(descriptionId, (value) => $descriptionId = value);
  $$unsubscribe_errors = subscribe(errors, (value) => $errors = value);
  $$unsubscribe_constraints = subscribe(constraints, (value) => $constraints = value);
  const controlContext = {
    id: writable(id),
    attrs: writable(),
    labelAttrs: writable()
  };
  const { id: idStore } = controlContext;
  $$unsubscribe_idStore = subscribe(idStore, (value) => $idStore = value);
  setFormControl(controlContext);
  if ($$props.id === void 0 && $$bindings.id && id !== void 0) $$bindings.id(id);
  {
    controlContext.id.set(id);
  }
  errorAttr = getDataFsError($errors);
  attrs = {
    name: $name,
    id: $idStore,
    "data-fs-error": errorAttr,
    "aria-describedby": getAriaDescribedBy({
      fieldErrorsId: $fieldErrorsId,
      descriptionId: $descriptionId,
      errors: $errors
    }),
    "aria-invalid": getAriaInvalid($errors),
    "aria-required": getAriaRequired($constraints),
    "data-fs-control": ""
  };
  labelAttrs = {
    for: $idStore,
    "data-fs-label": "",
    "data-fs-error": errorAttr
  };
  {
    controlContext.attrs.set(attrs);
  }
  {
    controlContext.labelAttrs.set(labelAttrs);
  }
  $$unsubscribe_idStore();
  $$unsubscribe_constraints();
  $$unsubscribe_errors();
  $$unsubscribe_descriptionId();
  $$unsubscribe_fieldErrorsId();
  $$unsubscribe_name();
  return ` ${slots.default ? slots.default({ attrs }) : ``}`;
});
const Field_errors = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let errorAttr;
  let fieldErrorsAttrs;
  let errorAttrs;
  let $$restProps = compute_rest_props($$props, ["id", "asChild", "el"]);
  let $fieldErrorsId, $$unsubscribe_fieldErrorsId;
  let $errors, $$unsubscribe_errors;
  const { fieldErrorsId, errors } = getFormField();
  $$unsubscribe_fieldErrorsId = subscribe(fieldErrorsId, (value) => $fieldErrorsId = value);
  $$unsubscribe_errors = subscribe(errors, (value) => $errors = value);
  let { id = generateId() } = $$props;
  let { asChild = false } = $$props;
  let { el = void 0 } = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0) $$bindings.id(id);
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0) $$bindings.asChild(asChild);
  if ($$props.el === void 0 && $$bindings.el && el !== void 0) $$bindings.el(el);
  errorAttr = getDataFsError($errors);
  {
    fieldErrorsId.set(id);
  }
  fieldErrorsAttrs = {
    id: $fieldErrorsId,
    "data-fs-error": errorAttr,
    "data-fs-field-errors": "",
    "aria-live": "assertive",
    ...$$restProps
  };
  errorAttrs = {
    "data-fs-field-error": "",
    "data-fs-error": errorAttr
  };
  $$unsubscribe_fieldErrorsId();
  $$unsubscribe_errors();
  return ` ${asChild ? `${slots.default ? slots.default({
    errors: $errors,
    fieldErrorsAttrs,
    errorAttrs
  }) : ``}` : `<div${spread([escape_object(fieldErrorsAttrs)], {})}${add_attribute("this", el, 0)}>${slots.default ? slots.default({
    errors: $errors,
    fieldErrorsAttrs,
    errorAttrs
  }) : ` ${each($errors, (error) => {
    return `<div${spread([escape_object(errorAttrs)], {})}>${escape(error)}</div>`;
  })} `}</div>`}`;
});
const Form_field_errors = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "errorClasses"]);
  let { class: className = void 0 } = $$props;
  let { errorClasses = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  if ($$props.errorClasses === void 0 && $$bindings.errorClasses && errorClasses !== void 0) $$bindings.errorClasses(errorClasses);
  return `${validate_component(Field_errors, "FormPrimitive.FieldErrors").$$render(
    $$result,
    Object.assign(
      {},
      {
        class: cn("text-destructive text-sm font-medium", className)
      },
      $$restProps
    ),
    {},
    {
      default: ({ errors, fieldErrorsAttrs, errorAttrs }) => {
        return `${slots.default ? slots.default({ errors, fieldErrorsAttrs, errorAttrs }) : ` ${each(errors, (error) => {
          return `<div${spread(
            [
              escape_object(errorAttrs),
              {
                class: escape_attribute_value(cn(errorClasses))
              }
            ],
            {}
          )}>${escape(error)}</div>`;
        })} `}`;
      }
    }
  )}`;
});
const Form_field = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { form } = $$props;
  let { name } = $$props;
  let { class: className = void 0 } = $$props;
  if ($$props.form === void 0 && $$bindings.form && form !== void 0) $$bindings.form(form);
  if ($$props.name === void 0 && $$bindings.name && name !== void 0) $$bindings.name(name);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  return `${validate_component(Field, "FormPrimitive.Field").$$render($$result, { form, name }, {}, {
    default: ({ constraints, errors, tainted, value }) => {
      return `<div${add_attribute("class", cn("space-y-2", className), 0)}>${slots.default ? slots.default({ constraints, errors, tainted, value }) : ``}</div>`;
    }
  })}`;
});
const Form_button = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, []);
  return `${validate_component(Button, "Button.Root").$$render($$result, Object.assign({}, { type: "submit" }, $$restProps), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Control = Control$1;
export {
  Chevron_left as C,
  Form_field as F,
  GitHubSvg as G,
  Loader as L,
  Control as a,
  Form_field_errors as b,
  Form_button as c
};
