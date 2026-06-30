const { generateLicenses } = require("./.next/server/app/(main)/admin/licenses/actions.js");
(async () => {
  const res = await generateLicenses(50);
  console.log("Result:", res);
})();
