import { NextResponse } from "next/server";

import { isLicenseActive } from "@/lib/server/verify-license";

type SmsRequest = {
  number?: string;
  message?: string;
  licenseKey?: string;
};

export async function POST(request: Request) {
  try {
    const { number, message, licenseKey } = (await request.json()) as SmsRequest;

    if (!number || !message) {
      return NextResponse.json({ success: false, error: "Numéro et message requis" }, { status: 400 });
    }

    if (!(await isLicenseActive(licenseKey))) {
      return NextResponse.json({ success: false, error: "Licence invalide ou inactive." }, { status: 401 });
    }

    const username = process.env.CLICKSEND_USERNAME;
    const apiKey = process.env.CLICKSEND_API_KEY;

    if (!username || !apiKey) {
      return NextResponse.json(
        { success: false, error: "Configuration ClickSend manquante sur Netlify" },
        { status: 500 },
      );
    }

    const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");
    const response = await fetch("https://rest.clicksend.com/v3/sms/send", {
      body: JSON.stringify({
        messages: [
          {
            body: message,
            source: "BeharTech",
            to: number,
          },
        ],
      }),
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok || data.http_code !== 200) {
      return NextResponse.json(
        {
          success: false,
          error: data.response_msg || "Échec de l'envoi via ClickSend",
          details: data,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, provider: "ClickSend", data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur SMS",
      },
      { status: 500 },
    );
  }
}
