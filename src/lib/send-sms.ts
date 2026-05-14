"use client";

export async function sendRealSms(number: string, message: string) {
  const response = await fetch("/api/send-sms", {
    body: JSON.stringify({ message, number }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.details?.response_msg || "Erreur ClickSend");
  }

  return data;
}
