// api/generate-invoice.js
// Pulls confirmed Coaching appointments from GHL for the PREVIOUS calendar month
// (or an explicit ?from/?to range), calculates billing at $93.75/call
// (15min prep @ $75/hr + 30min call @ $150/hr), and emails a formatted invoice
// to accounting@askloral.com + invoice@askloral.com + coaching@askloral.com + Kelli.
//
// AUTOMATIC: runs via Vercel cron on the 1st of each month (see vercel.json),
//            billing the previous calendar month. No manual action needed.
// MANUAL:    https://www.talktokelli.com/api/generate-invoice?key=YOUR_CRON_SECRET&from=2026-05-01&to=2026-05-31
//
// Required Vercel env vars:
//   GHL_API_KEY
//   GHL_LOCATION_ID
//   RESEND_API_KEY
//   FROM_EMAIL
//   CRON_SECRET

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_HEADERS = (apiKey) => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${apiKey}`,
  "Version": "2021-07-28",
});

const PREP_RATE    = 75.00;
const PREP_MINS    = 15;
const CALL_RATE    = 150.00;
const CALL_MINS    = 30;
const PREP_COST    = (PREP_MINS / 60) * PREP_RATE;   // $18.75
const CALL_COST    = (CALL_MINS / 60) * CALL_RATE;   // $75.00
const TOTAL_PER    = PREP_COST + CALL_COST;           // $93.75

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization || "";
    const keyParam = req.query.key || "";
    const authed = authHeader === `Bearer ${cronSecret}` || keyParam === cronSecret;
    if (!authed) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const apiKey     = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    return res.status(500).json({ error: "GHL_API_KEY or GHL_LOCATION_ID not set" });
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const prevMonthLastDay  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const prevMonthFirstDay = new Date(Date.UTC(prevMonthLastDay.getUTCFullYear(), prevMonthLastDay.getUTCMonth(), 1));
  const defFrom = `${prevMonthFirstDay.getUTCFullYear()}-${pad(prevMonthFirstDay.getUTCMonth() + 1)}-01`;
  const defTo   = `${prevMonthLastDay.getUTCFullYear()}-${pad(prevMonthLastDay.getUTCMonth() + 1)}-${pad(prevMonthLastDay.getUTCDate())}`;

  const fromDate = req.query.from || defFrom;
  const toDate   = req.query.to   || defTo;

  const startTime = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const endTime   = new Date(`${toDate}T23:59:59.000Z`).getTime();

  // ── 1. Fetch appointments from GHL ─────────────────────────────
  let appointments = [];
  try {
    const url = `${GHL_BASE}/calendars/events?locationId=${locationId}&startTime=${startTime}&endTime=${endTime}&calendarId=rCe4hoZBLKZJrwuFEXgH`;
    const ghlRes = await fetch(url, { headers: GHL_HEADERS(apiKey) });

    if (!ghlRes.ok) {
      const err = await ghlRes.text();
      console.error("GHL appointments error:", err);
      return res.status(500).json({ error: "Failed to fetch GHL appointments", detail: err });
    }

    const data = await ghlRes.json();
    const allEvents = data.events || data.appointments || [];
    console.log("GHL total events:", allEvents.length);

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
    const date = new Date(appt.startTime).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
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

  // ── 2b. CSV export ──────────────────────────────────────────────
  if (req.query.format === "csv") {
    const csvRows = [
      ["Invoice #", invoiceNum],
      ["From", "CKO Global INC — Coaching Services Invoice"],
      ["Period", `${fromDate} to ${toDate}`],
      ["Generated", new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
      [],
      ["#", "Date", "Client", "Prep 15min @ $75/hr", "Call 30min @ $150/hr", "Line Total"],
      ...lineItems.map(l => [l.num, l.date, l.client, `$${l.prepCost.toFixed(2)}`, `$${l.callCost.toFixed(2)}`, `$${l.total.toFixed(2)}`]),
      [],
      ["", "", `TOTAL (${lineItems.length} sessions)`, `$${(lineItems.length * PREP_COST).toFixed(2)}`, `$${(lineItems.length * CALL_COST).toFixed(2)}`, `$${grandTotal.toFixed(2)}`],
    ];
    const csv = csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="coaching-invoice-${invoiceNum}.csv"`);
    return res.status(200).send(csv);
  }

  // ── 3. Build invoice text (itemized) ───────────────────────────
  const divider = "═".repeat(88);
  const thin    = "─".repeat(88);

  const header = [
    divider,
    "COACHING SERVICES INVOICE",
    divider,
    `Invoice #:    ${invoiceNum}`,
    `Invoice Date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    `Period:       ${fromDate} through ${toDate}`,
    `From:         Kelli Owens / CKO Global INC`,
    `              kelli@proactively-lazy.com  |  346-628-5216`,
    `To:           Loral Accounting`,
    `              accounting@askloral.com`,
    divider,
    "",
    "BILLING RATES",
    thin,
    `  Pre-Call Prep:  ${PREP_MINS} min @ $${PREP_RATE.toFixed(2)}/hr = $${PREP_COST.toFixed(2)} per call`,
    `  Coaching Call:  ${CALL_MINS} min @ $${CALL_RATE.toFixed(2)}/hr = $${CALL_COST.toFixed(2)} per call`,
    `  Total Per Call: $${TOTAL_PER.toFixed(2)}`,
    "",
    "SESSION LOG — ITEMIZED",
    thin,
    `  ${"#".padEnd(4)}${"Date".padEnd(26)}${"Client".padEnd(30)}${"Prep (15m)".padEnd(14)}${"Call (30m)".padEnd(14)}${"Total"}`,
    thin,
  ].join("\n");

  const rows = lineItems.map(l =>
    `  ${String(l.num).padEnd(4)}${l.date.padEnd(26)}${l.client.padEnd(30)}${"$" + l.prepCost.toFixed(2)}${" ".repeat(8)}${"$" + l.callCost.toFixed(2)}${" ".repeat(8)}$${l.total.toFixed(2)}`
  ).join("\n");

  const footer = [
    thin,
    `  Sessions:       ${lineItems.length}`,
    `  Prep Subtotal:  $${(lineItems.length * PREP_COST).toFixed(2)}  (${lineItems.length} x $${PREP_COST.toFixed(2)})`,
    `  Call Subtotal:  $${(lineItems.length * CALL_COST).toFixed(2)}  (${lineItems.length} x $${CALL_COST.toFixed(2)})`,
    "",
    divider,
    `  AMOUNT DUE:     $${grandTotal.toFixed(2)}`,
    `  Payment due within 30 days of invoice date.`,
    divider,
    "",
    thin,
    "Generated automatically via TalkToKelli.com Coaching Invoice System",
  ].join("\n");

  const invoiceText = [header, rows, footer].join("\n");

  // ── 4. Send via Resend ──────────────────────────────────────────
  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || "TalkToKelli <coaching@proactively-lazy.com>",
        to: ["accounting@askloral.com", "invoice@askloral.com"],
        cc: ["coaching@askloral.com", "kelli@proactively-lazy.com"],
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
    sentTo: ["accounting@askloral.com", "invoice@askloral.com", "coaching@askloral.com", "kelli@proactively-lazy.com"],
  });
}
