import { d as getContext } from "./lifecycle.js";
function getCms() {
  return getContext("cms");
}
export {
  getCms as g
};
