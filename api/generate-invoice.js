// api/generate-invoice.js
// Pulls all confirmed Coaching appointments from GHL from Jan 1 to today,
// calculates billing at $93.75/call (15min prep @ $75/hr + 30min call @ $150/hr),
// and emails a formatted invoice to accounting@askiws.com + coaching@askiws.com
//
// Trigger by visiting: https://www.talktokelli.com/api/generate-invoice?from=2026-01-01
// Optional params: from (default Jan 1 current year), to (default today)
//
// Required Vercel env vars:
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

const PREP_RATE    = 75.00;   // per hour
const PREP_MINS    = 15;
const CALL_RATE    = 150.00;  // per hour
const CALL_MINS    = 30;
const PREP_COST    = (PREP_MINS / 60) * PREP_RATE;   // $18.75
const CALL_COST    = (CALL_MINS / 60) * CALL_RATE;   // $75.00
const TOTAL_PER    = PREP_COST + CALL_COST;           // $93.75

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey     = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    return res.status(500).json({ error: "GHL_API_KEY or GHL_LOCATION_ID not set" });
  }

  const now      = new Date();
  const fromDate = req.query.from || `${now.getFullYear()}-01-01`;
  const toDate   = req.query.to   || now.toISOString().split("T")[0];

  const startTime = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const endTime   = new Date(`${toDate}T23:59:59.000Z`).getTime();

  // ── 1. Fetch all appointments from GHL ─────────────────────────
  let appointments = [];
  try {
    const url = `${GHL_BASE}/calendars/events?locationId=${locationId}&startTime=${startTime}&endTime=${endTime}&calendarId=rCe4hoZBLKZJrwuFEXgH&limit=100`;
    const ghlRes = await fetch(url, { headers: GHL_HEADERS(apiKey) });

    if (!ghlRes.ok) {
      const err = await ghlRes.text();
      console.error("GHL appointments error:", err);
      return res.status(500).json({ error: "Failed to fetch GHL appointments", detail: err });
    }

    const data = await ghlRes.json();
    console.log("GHL raw keys:", Object.keys(data));
    const allEvents = data.events || data.appointments || [];
    console.log("GHL total events:", allEvents.length);
    if (allEvents.length > 0) console.log("Sample event status:", allEvents[0].status, allEvents[0].appointmentStatus);

    // Filter: confirmed status, exclude non-coaching events, must have contactId
    const EXCLUDE_KEYWORDS = ["block", "lunch", "busy", "mastermind", "master mind", "laser", "round table", "roundtable"];
    appointments = allEvents.filter(e => {
      const status = e.appointmentStatus || e.status || "";
      const title = (e.title || "").toLowerCase();
      const isConfirmed = ["confirmed","booked","new"].includes(status);
      const isExcluded = EXCLUDE_KEYWORDS.some(kw => title.includes(kw)) || e.isRecurring === true;
      const hasContact = !!e.contactId;
      return isConfirmed && !isExcluded && hasContact;
    });
    console.log("Filtered appointments:", appointments.length);

    if (req.query.debug === "1") {
      return res.status(200).json({ debug: true, totalEvents: allEvents.length, filteredCount: appointments.length, filtered: appointments.slice(0,5), allTitles: allEvents.map(e => e.title) });
    }
  } catch (e) {
    console.error("GHL fetch error:", e);
    return res.status(500).json({ error: "GHL fetch failed", detail: e.message });
  }

  if (appointments.length === 0) {
    return res.status(200).json({ message: "No coaching appointments found in date range.", from: fromDate, to: toDate });
  }

  // ── 2. Build line items ─────────────────────────────────────────
  const lineItems = appointments.map((appt, i) => {
    const date     = new Date(appt.startTime).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
    const clientName = appt.title || appt.contactName || "Unknown Client";
    return {
      num: i + 1,
      date,
      client: clientName,
      prepMins: PREP_MINS,
      prepCost: PREP_COST,
      callMins: CALL_MINS,
      callCost: CALL_COST,
      total: TOTAL_PER,
    };
  });

  const grandTotal = lineItems.length * TOTAL_PER;
  const invoiceNum = `TK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  // ── 3. Build invoice text ───────────────────────────────────────
  const divider  = "═".repeat(72);
  const thin     = "─".repeat(72);

  const header = [
    divider,
    "COACHING SERVICES INVOICE",
    divider,
    `Invoice #:    ${invoiceNum}`,
    `Invoice Date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    `Period:       ${fromDate} through ${toDate}`,
    `From:         Kelli Owens / CKO Global INC`,
    `              kelli@proactively-lazy.com`,
    `To:           ASKIWS Accounting`,
    `              accounting@askiws.com`,
    divider,
    "",
    "BILLING RATES",
    thin,
    `  Pre-Call Prep:  ${PREP_MINS} minutes @ $${PREP_RATE.toFixed(2)}/hr = $${PREP_COST.toFixed(2)} per call`,
    `  Coaching Call:  ${CALL_MINS} minutes @ $${CALL_RATE.toFixed(2)}/hr = $${CALL_COST.toFixed(2)} per call`,
    `  Total Per Call: $${TOTAL_PER.toFixed(2)}`,
    "",
    "SESSION LOG",
    thin,
    `  #   Date                    Client                     Total`,
    thin,
  ].join("\n");

  const rows = lineItems.map(l =>
    `  ${String(l.num).padEnd(4)}${l.date.padEnd(24)}${l.client.padEnd(27)}$${l.total.toFixed(2)}`
  ).join("\n");

  const footer = [
    thin,
    `  Total Sessions: ${lineItems.length}`,
    `  Prep Subtotal:  $${(lineItems.length * PREP_COST).toFixed(2)}  (${lineItems.length} x ${PREP_MINS} min)`,
    `  Call Subtotal:  $${(lineItems.length * CALL_COST).toFixed(2)}  (${lineItems.length} x ${CALL_MINS} min)`,
    "",
    divider,
    `  AMOUNT DUE:     $${grandTotal.toFixed(2)}`,
    divider,
    "",
    "Payment due within 30 days of invoice date.",
    "Questions: kelli@proactively-lazy.com | 346-628-5216",
    "",
    thin,
    "Generated automatically via TalkToKelli.com Coaching Invoice System",
  ].join("\n");

  const invoiceText = [header, rows, footer].join("\n");

  // ── 4. Send invoice via Resend ──────────────────────────────────
  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || "TalkToKelli <coaching@proactively-lazy.com>",
        to: ["accounting@askiws.com"],
        cc: ["coaching@askiws.com", "kelli@proactively-lazy.com"],
        subject: `Coaching Invoice ${invoiceNum} — ${lineItems.length} Sessions — $${grandTotal.toFixed(2)}`,
        text: invoiceText,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json();
      console.error("Resend error:", err);
      return res.status(500).json({ error: "Email failed", detail: err });
    }
  } catch (e) {
    console.error("Resend error:", e);
    return res.status(500).json({ error: "Email failed", detail: e.message });
  }

  return res.status(200).json({
    success: true,
    invoiceNumber: invoiceNum,
    sessions: lineItems.length,
    totalDue: `$${grandTotal.toFixed(2)}`,
    period: { from: fromDate, to: toDate },
    sentTo: ["accounting@askiws.com", "coaching@askiws.com", "kelli@proactively-lazy.com"],
  });
}
