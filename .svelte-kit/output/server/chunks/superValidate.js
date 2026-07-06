import { f as fail$1 } from "./index.js";
import "just-clone";
import { p as parseRequest, m as mergeDefaults, b as mapErrors, r as replaceInvalidDefaults } from "./zod.js";
import "ts-deepmerge";
async function superValidate(data, adapter, options) {
  if (data && "superFormValidationLibrary" in data) {
    options = adapter;
    adapter = data;
    data = void 0;
  }
  const validator = adapter;
  const defaults = options?.defaults ?? validator.defaults;
  const jsonSchema = validator.jsonSchema;
  const parsed = await parseRequest(data, jsonSchema, options);
  const addErrors = options?.errors ?? (options?.strict ? true : !!parsed.data);
  const parsedData = options?.strict ? parsed.data ?? {} : mergeDefaults(parsed.data, defaults);
  let status;
  if (!!parsed.data || addErrors) {
    status = await /* @__PURE__ */ validator.validate(parsedData);
  } else {
    status = { success: false, issues: [] };
  }
  const valid = status.success;
  const errors = valid || !addErrors ? {} : mapErrors(status.issues, validator.shape);
  const dataWithDefaults = valid ? status.data : replaceInvalidDefaults(options?.strict ? mergeDefaults(parsedData, defaults) : parsedData, defaults, jsonSchema, status.issues, options?.preprocessed);
  let outputData;
  if (jsonSchema.additionalProperties === false) {
    outputData = {};
    for (const key of Object.keys(jsonSchema.properties ?? {})) {
      if (key in dataWithDefaults)
        outputData[key] = dataWithDefaults[key];
    }
  } else {
    outputData = dataWithDefaults;
  }
  const output = {
    id: parsed.id ?? options?.id ?? validator.id,
    valid,
    posted: parsed.posted,
    errors,
    data: outputData
  };
  if (!parsed.posted) {
    output.constraints = validator.constraints;
    if (Object.keys(validator.shape).length) {
      output.shape = validator.shape;
    }
  }
  return output;
}
function withFiles(obj) {
  if (typeof obj !== "object")
    return obj;
  for (const key in obj) {
    const value = obj[key];
    if (value instanceof File)
      delete obj[key];
    else if (value && typeof value === "object")
      withFiles(value);
  }
  return obj;
}
const removeFiles = withFiles;
function fail(status, data) {
  function checkForm(data2) {
    return !!data2 && typeof data2 === "object" && "valid" in data2 && "data" in data2 && "id" in data2;
  }
  function checkObj(data2) {
    if (data2 && typeof data2 === "object") {
      for (const key in data2) {
        const v = data2[key];
        if (checkForm(v)) {
          v.valid = false;
          removeFiles(v);
        } else if (v && typeof v === "object") {
          checkObj(v);
        }
      }
    }
    return data2;
  }
  return fail$1(status, checkObj(data));
}
export {
  fail as f,
  superValidate as s
};
