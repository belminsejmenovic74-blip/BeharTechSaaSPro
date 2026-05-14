import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Behar Tech",
  version: packageJson.version,
  copyright: `© ${currentYear}, Behar Tech.`,
  meta: {
    title: "Behar Tech - Dashboard atelier",
    description: "Dashboard SaaS B2B pour réparateurs de smartphones, ordinateurs, tablettes et consoles.",
  },
};
