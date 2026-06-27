if (!process.env.PERCY_TOKEN) {
  console.error("PERCY_TOKEN is missing. Export it before running visual tests.");
  console.error("Example: export PERCY_TOKEN=your_project_token");
  process.exit(1);
}
