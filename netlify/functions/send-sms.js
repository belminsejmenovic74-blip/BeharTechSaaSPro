export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 405,
      body: JSON.stringify({ error: "Méthode non autorisée" }),
    };
  }

  try {
    const { number, message } = JSON.parse(event.body);

    if (!number || !message) {
      return {
        headers: { "Content-Type": "application/json" },
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Numéro et message requis" }),
      };
    }

    const username = process.env.CLICKSEND_USERNAME;
    const apiKey = process.env.CLICKSEND_API_KEY;

    if (!username || !apiKey) {
      return {
        headers: { "Content-Type": "application/json" },
        statusCode: 500,
        body: JSON.stringify({ success: false, error: "Configuration ClickSend manquante sur Netlify" }),
      };
    }

    const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");

    const response = await fetch("https://rest.clicksend.com/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            source: "BeharTech",
            body: message,
            to: number,
          },
        ],
      }),
    });

    const data = await response.json();

    if (response.ok && data.http_code === 200) {
      return {
        headers: { "Content-Type": "application/json" },
        statusCode: 200,
        body: JSON.stringify({ success: true, provider: "ClickSend", data }),
      };
    }

    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 502,
      body: JSON.stringify({
        success: false,
        error: data.response_msg || "Échec de l'envoi via ClickSend",
        details: data,
      }),
    };
  } catch (error) {
    return {
      headers: { "Content-Type": "application/json" },
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur serveur Netlify Function",
      }),
    };
  }
};
