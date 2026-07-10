"use client";

import { useBeharStore } from "@/lib/behar-store";

export async function sendRealSms(number: string, message: string) {
  const licenseKey = useBeharStore.getState().licenseKey;
  const response = await fetch("/api/send-sms", {
    body: JSON.stringify({ message, number, licenseKey }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.details?.response_msg || "Erreur ClickSend");
  }

  return data;
}
