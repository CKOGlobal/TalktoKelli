// api/release-report.js
// Handles Kelli clicking the Release or Hold button in the post-call review email.
// GET /api/release-report?cid=XXX&action=release|hold&t=YYY
//
// Release: fetches the latest POST-CALL TASK LIST note from GHL,
//          emails it to the client + COACHING_CC_EMAIL,
//          tags contact as "report-released".
// Hold:    tags contact as "report-held". Nothing else sent.
//
// Required Vercel env vars:
//   GHL_API_KEY
//   GHL_LOCATION_ID
//   RESEND_API_KEY
//   FROM_EMAIL
//   COACHING_CC_EMAIL         — e.g. coaching@askiws.com
//   RELEASE_TOKEN_SECRET      — must match what zoom-summary.js used to sign

import crypto from "crypto";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_HEADERS = (apiKey) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${apiKey}`,
  "Version": "2021-07-28",
});

function verifyToken(contactId, providedToken, secret) {
  if (!contactId || !providedToken || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(contactId)
    .digest("hex")
    .substring(0, 16);
  // constant-time compare
  if (expected.length !== providedToken.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(providedToken));
}

async function getContact(contactId, apiKey) {
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      headers: GHL_HEADERS(apiKey),
    });
    if (!res.ok) {
      console.error("GHL getContact failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.contact || null;
  } catch (e) {
    console.error("GHL getContact error:", e);
    return null;
  }
}

async function getLatestTaskListNote(contactId, apiKey) {
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
      headers: GHL_HEADERS(apiKey),
    });
    if (!res.ok) {
      console.error("GHL getNotes failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const notes = data.notes || [];
    // Find the most recent note that starts with "POST-CALL TASK LIST"
    const sorted = notes
      .filter((n) => (n.body || "").startsWith("POST-CALL TASK LIST"))
      .sort((a, b) => new Date(b.dateAdded || b.createdAt || 0) - new Date(a.dateAdded || a.createdAt || 0));
    return sorted[0]?.body || null;
  } catch (e) {
    console.error("GHL getNotes error:", e);
    return null;
  }
}

async function addTags(contactId, tags, apiKey) {
  try {
    await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: GHL_HEADERS(apiKey),
      body: JSON.stringify({ tags }),
    });
  } catch (e) {
    console.error("GHL addTags error:", e);
  }
}

async function removeTags(contactId, tags, apiKey) {
  try {
    await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: "DELETE",
      headers: GHL_HEADERS(apiKey),
      body: JSON.stringify({ tags }),
    });
  } catch (e) {
    console.error("GHL removeTags error:", e);
  }
}

function htmlPage(title, headline, message, accentColor = "#C4622D") {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} — TalkToKelli</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; background: #F7F3EE; color: #2C1A0E; margin: 0; padding: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { max-width: 480px; margin: 40px 20px; background: #FFFFFF; padding: 48px 36px; border-radius: 16px; border: 1px solid #E8DDD0; text-align: center; box-shadow: 0 8px 32px rgba(44,26,14,0.06); }
    .badge { display: inline-block; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: ${accentColor}; margin-bottom: 16px; }
    h1 { font-size: 26px; margin: 0 0 16px; color: #2C1A0E; font-weight: 500; }
    p { color: #6B4E35; line-height: 1.7; font-size: 15px; margin: 0 0 12px; }
    .footer { margin-top: 32px; font-size: 12px; color: #9C8068; }
    a { color: ${accentColor}; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${title}</div>
    <h1>${headline}</h1>
    <p>${message}</p>
    <div class="footer">TalkToKelli.com · You can close this tab.</div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(405).send(htmlPage("Error", "Method Not Allowed", "This endpoint only accepts GET requests."));
  }

  const { cid, action, t } = req.query;
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!cid || !action || !t) {
    return res.status(400).send(htmlPage("Error", "Missing Parameters", "This release link is incomplete. Open the original review email and click the button again."));
  }

  if (action !== "release" && action !== "hold") {
    return res.status(400).send(htmlPage("Error", "Invalid Action", "The action in this link is not recognized."));
  }

  const secret = process.env.RELEASE_TOKEN_SECRET;
  if (!secret) {
    console.error("RELEASE_TOKEN_SECRET not set in env");
    return res.status(500).send(htmlPage("Error", "Server Misconfigured", "RELEASE_TOKEN_SECRET is not set. Add it in Vercel env vars."));
  }

  if (!verifyToken(cid, t, secret)) {
    return res.status(401).send(htmlPage("Error", "Invalid or Expired Link", "This release link did not pass security validation. It may have been modified or generated with a different secret."));
  }

  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) {
    return res.status(500).send(htmlPage("Error", "Server Misconfigured", "GHL_API_KEY is not set."));
  }

  // ── HOLD ─────────────────────────────────────────────────────────
  if (action === "hold") {
    await removeTags(cid, ["report-pending"], apiKey);
    await addTags(cid, ["report-held"], apiKey);
    return res
      .status(200)
      .send(
        htmlPage(
          "Held",
          "Report Held",
          "Nothing was sent to the client or coaching team. The task list is still saved as a private note in this contact's GHL record. You can release it later from there if you change your mind.",
          "#8B6B47"
        )
      );
  }

  // ── RELEASE ──────────────────────────────────────────────────────
  const contact = await getContact(cid, apiKey);
  if (!contact) {
    return res.status(404).send(htmlPage("Error", "Contact Not Found", "Could not find this contact in GHL. Nothing was sent."));
  }

  const clientEmail = contact.email || contact.emailAddress || null;
  const clientName =
    contact.firstName || contact.lastName
      ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
      : "your coaching client";

  const noteBody = await getLatestTaskListNote(cid, apiKey);
  if (!noteBody) {
    return res.status(404).send(htmlPage("Error", "Task List Not Found", "Could not find a recent task list note for this contact. Nothing was sent."));
  }

  // Compose final email — TO client (if email exists) + CC coaching team + Kelli
  const coachingCc = process.env.COACHING_CC_EMAIL;
  const kelliEmails = ["kelli@proactively-lazy.com", "kelli.owens@TheKOrealtygroup.com"];

  const ccList = [];
  if (coachingCc) ccList.push(coachingCc);
  for (const ke of kelliEmails) ccList.push(ke);

  const subject = clientEmail
    ? `Your Action Items from Today's Call — ${clientName}`
    : `[NO CLIENT EMAIL] Action Items — ${clientName}`;

  const emailPayload = {
    from: process.env.FROM_EMAIL || "TalkToKelli <coaching@proactively-lazy.com>",
    subject,
    text: noteBody,
  };

  if (clientEmail) {
    emailPayload.to = [clientEmail];
    emailPayload.cc = ccList;
  } else {
    // No client email — send to coaching + Kelli only so it isn't lost
    emailPayload.to = ccList.length ? ccList : kelliEmails;
  }

  let sendOk = false;
  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });
    sendOk = resendRes.ok;
    if (!sendOk) console.error("Resend release error:", await resendRes.json());
  } catch (e) {
    console.error("Resend release error:", e);
  }

  if (!sendOk) {
    return res
      .status(500)
      .send(
        htmlPage(
          "Send Failed",
          "Email Did Not Send",
          "The release was authorized but the email failed to send. The contact has not been retagged. Try again from the original review email, or check Resend logs.",
          "#A32D2D"
        )
      );
  }

  await removeTags(cid, ["report-pending"], apiKey);
  await addTags(cid, ["report-released"], apiKey);

  const recipientLine = clientEmail
    ? `Sent to ${clientEmail}, with the coaching team CC'd.`
    : `No client email on file — sent to the coaching team and to you so it isn't lost.`;

  return res
    .status(200)
    .send(
      htmlPage(
        "Released",
        "Report Sent",
        recipientLine,
        "#3D7A5C"
      )
    );
}
