// api/zoom-summary.js
// Called by Zapier when Zoom AI generates a new meeting summary.
// 1. Receives meeting summary from Zapier
// 2. Passes summary to Claude to generate a client task list
// 3. Finds the GHL contact by name (meeting topic)
// 4. Posts task list as a note on the contact
// 5. Emails task list TO client, CC Kelli via Resend
//
// Required Vercel env vars:
//   ANTHROPIC_API_KEY
//   GHL_API_KEY
//   GHL_LOCATION_ID
//   RESEND_API_KEY
//   FROM_EMAIL

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_HEADERS = (apiKey) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${apiKey}`,
  "Version": "2021-07-28",
});

async function searchContactByName(name, apiKey, locationId) {
  try {
    const res = await fetch(
      `${GHL_BASE}/contacts/?locationId=${locationId}&query=${encodeURIComponent(name)}`,
      { headers: GHL_HEADERS(apiKey) }
    );
    if (!res.ok) {
      console.error("GHL search failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    console.log("GHL search results for", name, ":", JSON.stringify(data.contacts?.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, email: c.email }))));
    return data.contacts?.[0] || null;
  } catch (e) {
    console.error("GHL searchContactByName error:", e);
    return null;
  }
}

async function addNote(contactId, body, apiKey) {
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: GHL_HEADERS(apiKey),
      body: JSON.stringify({ body }),
    });
    if (!res.ok) console.error("GHL addNote error:", await res.text());
    else console.log("GHL note posted to contact:", contactId);
  } catch (e) {
    console.error("GHL addNote error:", e);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let { meeting_topic, summary_overview, summary_details, host_email } = req.body;

  if (!summary_overview) {
    return res.status(400).json({ error: "summary_overview is required" });
  }

  // Strip Zapier field label prefix if present e.g. "Meeting Topic: Vanessa Vhay" → "Vanessa Vhay"
  if (meeting_topic) {
    meeting_topic = meeting_topic.replace(/^meeting\s*topic[:\s]*/i, "").trim();
  }

  // ── Gate: skip non-coaching calls silently ─────────────────────
  const SKIP_KEYWORDS = ["mastermind", "master mind", "laser", "round table", "roundtable", "quick call", "recording"];
  const topicLower = (meeting_topic || "").toLowerCase();
  if (SKIP_KEYWORDS.some(kw => topicLower.includes(kw))) {
    console.log("Skipping non-coaching call:", meeting_topic);
    return res.status(200).json({ skipped: true, reason: "non-coaching call", meeting_topic });
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // ── 1. Generate task list via Claude ───────────────────────────
  let taskList = "(task list unavailable)";
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: `You are a coaching assistant for Kelli Owens. Based on a Zoom meeting summary, create a clear, actionable post-call task list for the coaching client. Write directly to the client in a warm, encouraging tone. Use plain text with numbered tasks. No asterisks or markdown. Be specific — reference what was actually discussed. End with one sentence of encouragement. IMPORTANT: Never include URLs, hyperlinks, or web addresses in your output under any circumstances.`,
        messages: [{
          role: "user",
          content: `Meeting with: ${meeting_topic || "Coaching Client"}\nDate: ${dateStr}\n\nMeeting Summary:\n${summary_overview}\n\nAdditional Details:\n${summary_details || "none"}\n\nCreate a numbered action item list for the client. Each task should be clear and specific. Label it: YOUR ACTION ITEMS FROM TODAY'S CALL`,
        }],
      }),
    });
    const claudeData = await claudeRes.json();
    if (claudeData.error) {
      console.error("Claude API error response:", JSON.stringify(claudeData.error));
    } else {
      taskList = claudeData.content?.[0]?.text || taskList;
    }
  } catch (e) {
    console.error("Claude fetch error:", e);
  }

  const clientName = (meeting_topic || "Coaching Session").trim();

  const noteBody = [
    `POST-CALL TASK LIST — ${clientName.toUpperCase()}`,
    `Generated: ${dateStr}`,
    "",
    taskList,
    "",
    "────────────────────────────────────",
    "Auto-generated from Zoom AI Meeting Summary via TalkToKelli.com",
  ].join("\n");

  // ── 2. Find GHL contact and post note ──────────────────────────
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  let clientEmail = null;

  if (apiKey && locationId && meeting_topic) {
    const contact = await searchContactByName(meeting_topic, apiKey, locationId);
    if (contact) {
      // Only proceed if contact has "coaching" tag — ensures this was a TalkToKelli session
      const tags = contact.tags || [];
      const isCoachingClient = tags.some(t => typeof t === "string" ? t.toLowerCase().includes("coaching") : (t.name || "").toLowerCase().includes("coaching"));
      if (!isCoachingClient) {
        console.log("Skipping — contact found but no coaching tag:", meeting_topic);
        return res.status(200).json({ skipped: true, reason: "no coaching tag", contact: contact.id });
      }
      clientEmail = contact.email || contact.emailAddress || null;
      console.log("GHL contact found:", contact.id, "email:", clientEmail);
      await addNote(contact.id, noteBody, apiKey);
    } else {
      console.warn("No GHL contact found for:", meeting_topic);
      // Skip silently — not a TalkToKelli client
      return res.status(200).json({ skipped: true, reason: "contact not found", meeting_topic });
    }
  }

  // ── 3. Send task list email via Resend ─────────────────────────
  // Client receives email TO, Kelli is CC'd
  // If no client email found, send to Kelli only so nothing is lost
  const kelliEmails = ["kelli@proactively-lazy.com", "kelli.owens@TheKOrealtygroup.com"];

  try {
    const emailPayload = {
      from: process.env.FROM_EMAIL || "TalkToKelli <coaching@proactively-lazy.com>",
      subject: `Your Action Items from Today's Call — ${clientName}`,
      text: noteBody,
    };

    if (clientEmail) {
      emailPayload.to = [clientEmail];
      emailPayload.cc = kelliEmails;
    } else {
      // No client email — flag it in subject so Kelli knows
      emailPayload.to = kelliEmails;
      emailPayload.subject = `[NO CLIENT EMAIL] Action Items — ${clientName}`;
      console.warn("No client email found — sent to Kelli only for:", clientName);
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });
    if (!resendRes.ok) console.error("Resend error:", await resendRes.json());
  } catch (e) {
    console.error("Resend error:", e);
  }

  return res.status(200).json({ success: true, taskList, clientEmail });
}
