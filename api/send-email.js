// api/send-email.js
// Handles everything on form submit:
// 1. Generates AI coaching notes via Claude
// 2. Emails Kelli automatically via Resend
// 3. Posts to GHL webhook to tag contact as agenda-complete
// 4. Finds or creates GHL contact via API v2
// 5. Posts full agenda + coaching notes as a contact note
// 6. Tags contact as "coaching"
//
// Required Vercel env vars:
//   ANTHROPIC_API_KEY  — same as PLHub
//   RESEND_API_KEY     — from resend.com dashboard
//   GHL_WEBHOOK_URL    — GHL inbound webhook URL
//   GHL_API_KEY        — GHL Private Integration token
//   GHL_LOCATION_ID    — ej0h3KCidKhUgecxuye6
//   FROM_EMAIL         — verified sender in Resend

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_HEADERS = (apiKey) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${apiKey}`,
  "Version": "2021-07-28",
});

// Find contact by email, return contactId or null
async function findContact(email, apiKey, locationId) {
  try {
    const res = await fetch(
      `${GHL_BASE}/contacts/?locationId=${locationId}&email=${encodeURIComponent(email)}`,
      { headers: GHL_HEADERS(apiKey) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.contacts?.[0]?.id || null;
  } catch (e) {
    console.error("GHL findContact error:", e);
    return null;
  }
}

// Create contact, return contactId or null
async function createContact(contact, apiKey, locationId) {
  try {
    const nameParts = (contact.name || "").trim().split(" ");
    const res = await fetch(`${GHL_BASE}/contacts/`, {
      method: "POST",
      headers: GHL_HEADERS(apiKey),
      body: JSON.stringify({
        locationId,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: contact.email,
        phone: contact.phone || "",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.contact?.id || null;
  } catch (e) {
    console.error("GHL createContact error:", e);
    return null;
  }
}

// Post a note to the contact
async function addNote(contactId, body, apiKey) {
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: GHL_HEADERS(apiKey),
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("GHL addNote error:", err);
    }
  } catch (e) {
    console.error("GHL addNote error:", e);
  }
}

// Add tags to the contact
async function addTags(contactId, tags, apiKey) {
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: GHL_HEADERS(apiKey),
      body: JSON.stringify({ tags }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("GHL addTags error:", err);
    }
  } catch (e) {
    console.error("GHL addTags error:", e);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { contact, answers, qualQs, qualAnswers } = req.body;

  if (!contact?.email) return res.status(400).json({ error: "Email required" });

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });

  const SECTIONS = [
    { id: "accomplishments", eyebrow: "Since Our Last Call" },
    { id: "topics",          eyebrow: "Today's Agenda" },
    { id: "priority",        eyebrow: "Highest Priority" },
    { id: "questions",       eyebrow: "Specific Questions" },
    { id: "review",          eyebrow: "Bring It to the Table" },
    { id: "next30",          eyebrow: "Next 30 Days" },
    { id: "unfinished",      eyebrow: "Unfinished Business" },
  ];

  const summary      = SECTIONS.map(s => `${s.eyebrow.toUpperCase()}: ${answers?.[s.id] || "not provided"}`).join("\n\n");
  const agendaBlock  = SECTIONS.map(s => `${s.eyebrow.toUpperCase()}\n${answers?.[s.id] || "(not provided)"}`).join("\n\n────────────────────────────\n\n");
  const qualBlock    = qualQs ? qualQs.map((q, i) => `Follow-Up Q${i+1}: ${q.question}\nStudent Answer: ${qualAnswers?.[q.id] || "(not answered)"}`).join("\n\n") : "(none)";
  const qualSummary  = qualQs ? qualQs.map(q => `Q: ${q.question}\nA: ${qualAnswers?.[q.id] || "not answered"}`).join("\n\n") : "";

  // ── 1. Generate AI coaching notes ──────────────────────────────
  let coachNotes = "(coaching notes unavailable)";
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1400,
        system: `You are a coaching assistant helping Kelli Owens, a licensed Texas realtor and real estate investing coach who teaches the Exit First Framework. Write directly to Kelli in a collegial, direct tone. Be specific and reference what the student actually wrote. Plain text. Numbered lists where helpful. No asterisks or markdown symbols.`,
        messages: [{
          role: "user",
          content: `Student: ${contact.name}, Call #${contact.callNum || "?"}\n\nSTUDENT AGENDA:\n${summary}\n\nFOLLOW-UP Q&A:\n${qualSummary}\n\nWrite coaching prep notes for Kelli in these 4 sections:\n\n1. QUICK READ (2-3 sentences on where this student is right now)\n2. KEY THEMES TO WATCH (2-4 patterns, blockers, or opportunities — be specific to their words)\n3. SUGGESTED COACHING MOVES (3-4 specific approaches or questions Kelli might use)\n4. WATCH FOR (1-2 things that might be the real issue beneath what they wrote)`,
        }],
      }),
    });
    const claudeData = await claudeRes.json();
    coachNotes = claudeData.content?.[0]?.text || coachNotes;
  } catch (e) {
    console.error("Claude error:", e);
  }

  // ── 2. Build email + note body ──────────────────────────────────
  const sharedBody = [
    "PRE-CALL AGENDA — COACHING SESSION",
    `Received: ${dateStr} at ${timeStr}`,
    `Student: ${contact.name}`,
    `Email: ${contact.email}`,
    `Phone: ${contact.phone || "not provided"}`,
    `Call #: ${contact.callNum || "not specified"}`,
    "",
    "════════════════════════════════════",
    "STUDENT AGENDA",
    "════════════════════════════════════",
    "",
    agendaBlock,
    "",
    "════════════════════════════════════",
    "AI FOLLOW-UP Q&A",
    "════════════════════════════════════",
    "",
    qualBlock,
    "",
    "════════════════════════════════════",
    "AI COACHING PREP NOTES FOR KELLI",
    "════════════════════════════════════",
    "",
    coachNotes,
    "",
    "────────────────────────────────────",
    "Submitted via TalkToKelli.com Pre-Call Agenda System",
  ].join("\n");

  // ── 3. Send email via Resend ────────────────────────────────────
  let emailSent = false;
  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || "TalkToKelli <coaching@proactively-lazy.com>",
        to: ["kelli@proactively-lazy.com", "kelli.owens@TheKOrealtygroup.com"],
        reply_to: "kelli@proactively-lazy.com",
        subject: `Pre-Call Agenda: ${contact.name} — ${dateStr} at ${timeStr}`,
        text: sharedBody,
      }),
    });
    const resendData = await resendRes.json();
    emailSent = resendRes.ok;
    if (!resendRes.ok) console.error("Resend error:", resendData);
  } catch (e) {
    console.error("Resend error:", e);
  }

  // ── 4. Fire GHL inbound webhook (creates/updates contact + tags) ─
  try {
    const nameParts = (contact.name || "").trim().split(" ");
    await fetch(process.env.GHL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: contact.email,
        phone: contact.phone || "",
        tags: ["agenda-complete", "talk-to-kelli"],
        customField: {
          coaching_call_number: contact.callNum || "",
          agenda_submitted: now.toISOString(),
        },
      }),
    });
  } catch (e) {
    console.error("GHL webhook error:", e);
  }

  // ── 5. Find or create contact via GHL API, post note + tag ──────
  const apiKey    = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (apiKey && locationId) {
    try {
      // Find existing contact or create new one
      let contactId = await findContact(contact.email, apiKey, locationId);
      if (!contactId) {
        contactId = await createContact(contact, apiKey, locationId);
      }

      if (contactId) {
        // Post full agenda + coaching notes as a contact note
        await addNote(contactId, sharedBody, apiKey);

        // Tag as coaching
        await addTags(contactId, ["coaching"], apiKey);
      } else {
        console.error("GHL: could not find or create contact for", contact.email);
      }
    } catch (e) {
      console.error("GHL API flow error:", e);
    }
  } else {
    console.warn("GHL_API_KEY or GHL_LOCATION_ID not set — skipping contact note");
  }

  return res.status(200).json({ success: true, emailSent });
}
