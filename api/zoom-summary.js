// api/zoom-summary.js
// Called by Zapier when Zoom AI generates a new meeting summary.
// 1. Receives meeting summary from Zapier
// 2. Passes summary to Claude to generate a client task list
// 3. Finds the GHL contact by name (meeting topic)
// 4. Posts task list as a note on the contact (always — internal record)
// 5. Emails task list to KELLI ONLY with Release / Hold action buttons
//    - Release  → sends to client + coaching@askiws.com (configurable)
//    - Hold     → nothing further sent
//
// Required Vercel env vars:
//   ANTHROPIC_API_KEY
//   GHL_API_KEY
//   GHL_LOCATION_ID
//   RESEND_API_KEY
//   FROM_EMAIL
//   BASE_URL                  — e.g. https://talktokelli.com
//   RELEASE_TOKEN_SECRET      — any random string used to sign release URLs

import crypto from "crypto";

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
    console.log(
      "GHL search results for",
      name,
      ":",
      JSON.stringify(
        data.contacts?.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          email: c.email,
        }))
      )
    );
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

async function addTags(contactId, tags, apiKey) {
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: GHL_HEADERS(apiKey),
      body: JSON.stringify({ tags }),
    });
    if (!res.ok) console.error("GHL addTags error:", await res.text());
  } catch (e) {
    console.error("GHL addTags error:", e);
  }
}

function signContact(contactId, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(contactId)
    .digest("hex")
    .substring(0, 16);
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
  if (SKIP_KEYWORDS.some((kw) => topicLower.includes(kw))) {
    console.log("Skipping non-coaching call:", meeting_topic);
    return res.status(200).json({ skipped: true, reason: "non-coaching call", meeting_topic });
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        messages: [
          {
            role: "user",
            content: `Meeting with: ${meeting_topic || "Coaching Client"}\nDate: ${dateStr}\n\nMeeting Summary:\n${summary_overview}\n\nAdditional Details:\n${summary_details || "none"}\n\nCreate a numbered action item list for the client. Each task should be clear and specific. Label it: YOUR ACTION ITEMS FROM TODAY'S CALL`,
          },
        ],
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
  let contactId = null;

  if (apiKey && locationId && meeting_topic) {
    const contact = await searchContactByName(meeting_topic, apiKey, locationId);
    if (contact) {
      // Only proceed if contact has "coaching" tag — ensures this was a TalkToKelli session
      const tags = contact.tags || [];
      const isCoachingClient = tags.some((t) =>
        typeof t === "string"
          ? t.toLowerCase().includes("coaching")
          : (t.name || "").toLowerCase().includes("coaching")
      );
      if (!isCoachingClient) {
        console.log("Skipping — contact found but no coaching tag:", meeting_topic);
        return res.status(200).json({ skipped: true, reason: "no coaching tag", contact: contact.id });
      }
      clientEmail = contact.email || contact.emailAddress || null;
      contactId = contact.id;
      console.log("GHL contact found:", contactId, "email:", clientEmail);

      // Post note to GHL (always — internal record)
      await addNote(contactId, noteBody, apiKey);

      // Tag as report-pending — release endpoint will swap this for released/held
      await addTags(contactId, ["report-pending"], apiKey);
    } else {
      console.warn("No GHL contact found for:", meeting_topic);
      return res.status(200).json({ skipped: true, reason: "contact not found", meeting_topic });
    }
  }

  // ── 3. Build review email to KELLI ONLY with Release / Hold buttons ──
  const baseUrl = (process.env.BASE_URL || "https://talktokelli.com").replace(/\/$/, "");
  const secret = process.env.RELEASE_TOKEN_SECRET || "fallback-set-this-in-vercel";
  const token = contactId ? signContact(contactId, secret) : "";

  const releaseUrl = contactId
    ? `${baseUrl}/api/release-report?cid=${encodeURIComponent(contactId)}&action=release&t=${token}`
    : "";
  const holdUrl = contactId
    ? `${baseUrl}/api/release-report?cid=${encodeURIComponent(contactId)}&action=hold&t=${token}`
    : "";

  const escapeHtml = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const htmlBody = `<!DOCTYPE html>
<html><body style="margin:0; padding:0; background:#F7F3EE; font-family: Georgia, 'Times New Roman', serif; color:#2C1A0E;">
  <div style="max-width:640px; margin:0 auto; padding:32px 20px;">
    <div style="background:#2C1A0E; padding:20px 28px; border-radius:12px 12px 0 0;">
      <div style="font-family: Georgia, serif; font-size:18px; color:#E8D5C0; font-weight:500;">TalkToKelli — Report Ready for Review</div>
      <div style="font-size:11px; color:#8B6B47; letter-spacing:0.1em; text-transform:uppercase; margin-top:4px;">Action required before client receives</div>
    </div>
    <div style="background:#FFFFFF; border:1px solid #E8DDD0; border-top:none; padding:32px 28px; border-radius:0 0 12px 12px;">
      <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#2C1A0E;">
        <strong>Client:</strong> ${escapeHtml(clientName)}<br>
        <strong>Date:</strong> ${escapeHtml(dateStr)}<br>
        <strong>Client Email:</strong> ${escapeHtml(clientEmail || "(not on file)")}
      </p>
      <p style="margin:0 0 24px; font-size:14px; line-height:1.7; color:#6B4E35;">
        Review the task list below. If this was a no-show, a rambling call, or the AI got it wrong, click <strong>HOLD</strong> and nothing goes out. Click <strong>RELEASE</strong> to send the email to the client and CC the coaching team.
      </p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${releaseUrl}" style="display:inline-block; background:#3D7A5C; color:#FFFFFF; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:14px; letter-spacing:0.05em; margin:0 6px 10px;">
          RELEASE — Send to Client
        </a>
        <a href="${holdUrl}" style="display:inline-block; background:#8B6B47; color:#FFFFFF; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:14px; letter-spacing:0.05em; margin:0 6px 10px;">
          HOLD — Don't Send
        </a>
      </div>
      <hr style="border:0; border-top:1px solid #E8DDD0; margin:28px 0;">
      <div style="font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#C4622D; margin-bottom:12px;">Task List Preview</div>
      <pre style="white-space:pre-wrap; background:#FBF8F3; padding:20px; border-radius:8px; font-size:13px; color:#2C1A0E; font-family: Georgia, serif; line-height:1.7; border:1px solid #E8DDD0; margin:0;">${escapeHtml(noteBody)}</pre>
      <p style="margin:24px 0 0; font-size:11px; color:#9C8068; line-height:1.6;">
        The note above is already saved in this contact's GHL record. The Release/Hold choice only controls the outbound email to the client and coaching team.
      </p>
    </div>
  </div>
</body></html>`;

  const textBody = [
    "POST-CALL TASK LIST READY FOR REVIEW",
    "",
    `Client: ${clientName}`,
    `Date: ${dateStr}`,
    `Client Email: ${clientEmail || "(not on file)"}`,
    "",
    "──────────────────────────────",
    "RELEASE (send to client + coaching):",
    releaseUrl,
    "",
    "HOLD (do not send):",
    holdUrl,
    "──────────────────────────────",
    "",
    noteBody,
    "",
    "The note above is already saved in GHL. These buttons only control the outbound email.",
  ].join("\n");

  // ── 4. Send to KELLI ONLY ──────────────────────────────────────
  const kelliEmails = ["kelli@proactively-lazy.com", "kelli.owens@TheKOrealtygroup.com"];

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || "TalkToKelli <coaching@proactively-lazy.com>",
        to: kelliEmails,
        subject: `[REVIEW] Post-Call Report — ${clientName} — ${dateStr}`,
        text: textBody,
        html: htmlBody,
      }),
    });
    if (!resendRes.ok) console.error("Resend error:", await resendRes.json());
  } catch (e) {
    console.error("Resend error:", e);
  }

  return res.status(200).json({
    success: true,
    status: "pending-review",
    contactId,
    clientEmail,
  });
}
