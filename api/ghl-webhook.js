// api/ghl-webhook.js
// Fires when a student submits their coaching agenda.
// Posts to GHL inbound webhook → triggers the TalkToKelli automation workflow.
// Env vars needed in Vercel (Settings → Environment Variables):
//   GHL_WEBHOOK_URL  = https://services.leadconnectorhq.com/hooks/ej0h3KCidKhUgecxuye6/webhook-trigger/ab4e548c-f50f-4a4c-9bda-9be6125388d3
//   ANTHROPIC_API_KEY = (already set)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("GHL_WEBHOOK_URL not set");
    return res.status(500).json({ error: "GHL_WEBHOOK_URL not configured" });
  }

  try {
    const { name, email, phone, callNum } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Split name into first/last for GHL contact creation
    const nameParts = (name || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // POST to GHL inbound webhook
    // GHL will create or update the contact and fire the workflow
    const payload = {
      firstName,
      lastName,
      email,
      phone: phone || "",
      tags: ["agenda-complete", "talk-to-kelli"],
      customField: {
        coaching_call_number: callNum || "",
        agenda_submitted: new Date().toISOString(),
      },
    };

    const ghlRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!ghlRes.ok) {
      const errorText = await ghlRes.text();
      console.error("GHL webhook error:", errorText);
      // Don't fail the student's submission — log and continue
      return res.status(200).json({ success: true, ghlStatus: "failed", note: "GHL notification failed silently" });
    }

    return res.status(200).json({ success: true, ghlStatus: "sent" });

  } catch (err) {
    console.error("GHL webhook handler error:", err);
    // Fail silently — student experience is not affected by GHL errors
    return res.status(200).json({ success: true, ghlStatus: "error", note: err.message });
  }
}
