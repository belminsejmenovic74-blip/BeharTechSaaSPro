"use client";

import { useEffect, useState } from "react";

import { WidgetApp } from "@/components/widget/widget-app";
import { DEMO_CONFIG } from "@/lib/widget/demo-data";
import type { WidgetConfig } from "@/lib/widget/public-types";

export default function WidgetPreviewPage() {
  const [config, setConfig] = useState<WidgetConfig>(DEMO_CONFIG);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const trustedOrigins = new Set([window.location.origin, "https://behartechpro.fr"]);
      if (!trustedOrigins.has(event.origin) || event.source !== window.parent) return;
      if (event.data?.type !== "behar.widget.cms-preview" || !event.data.config) return;
      setConfig(event.data.config as WidgetConfig);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "behar.widget.cms-preview-ready" }, "*");
    return () => window.removeEventListener("message", receive);
  }, []);

  return <WidgetApp publicId="demo" previewConfig={config} />;
}
