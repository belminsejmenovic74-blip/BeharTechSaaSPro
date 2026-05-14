import fs from "fs";
import path from "path";

const presetsDir = "./src/styles/presets";
const files = fs.readdirSync(presetsDir);

files.forEach((file) => {
  if (file.endsWith(".css")) {
    const filePath = path.join(presetsDir, file);
    let content = fs.readFileSync(filePath, "utf-8");

    // Replace oklch(...) and oklab(...) with a dummy HEX color
    content = content.replace(/oklch\([^)]+\)/g, "#888888");
    content = content.replace(/oklab\([^)]+\)/g, "#888888");

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
