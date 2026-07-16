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

// Coaching calendar timezone. Invoice months follow LOCAL calendar dates, so a
// session at 2pm on Apr 30 Central belongs to April even though its UTC
// timestamp and GHL's fuzzy range boundary can pull it into a May query.
const BILLING_TZ   = "America/Chicago";
const localDateStr = (iso) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BILLING_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));   // → "2026-05-31"

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

  // Widen the GHL query ~1.5 days each side so no local-timezone boundary
  // session is dropped; the exact month is enforced client-side via localDateStr.
  const BUFFER_MS = 36 * 60 * 60 * 1000;
  const startTime = new Date(`${fromDate}T00:00:00.000Z`).getTime() - BUFFER_MS;
  const endTime   = new Date(`${toDate}T23:59:59.000Z`).getTime() + BUFFER_MS;

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
      // Enforce the exact billing month in the calendar's local timezone so
      // boundary sessions (e.g. Apr 30) never leak into an adjacent month.
      const localDate = e.startTime ? localDateStr(e.startTime) : "";
      const inRange = localDate >= fromDate && localDate <= toDate;
      return isConfirmed && !isExcluded && hasContact && inRange;
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

  // ── 3b. Itemized HTML invoice (renders as a real table in email clients) ──
  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const htmlRows = lineItems.map((l, idx) => `
        <tr style="background:${idx % 2 ? "#FBF8F3" : "#FFFFFF"};">
          <td style="padding:10px 8px;border-bottom:1px solid #EFE7DB;color:#9C8068;">${l.num}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #EFE7DB;white-space:nowrap;">${escapeHtml(l.date)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #EFE7DB;">${escapeHtml(l.client)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #EFE7DB;text-align:right;color:#4A3220;white-space:nowrap;">${l.prepMins}m&nbsp;·&nbsp;$${l.prepCost.toFixed(2)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #EFE7DB;text-align:right;color:#4A3220;white-space:nowrap;">${l.callMins}m&nbsp;·&nbsp;$${l.callCost.toFixed(2)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #EFE7DB;text-align:right;font-weight:bold;">$${l.total.toFixed(2)}</td>
        </tr>`).join("");

  const htmlBody = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F7F3EE;font-family:Georgia,'Times New Roman',serif;color:#2C1A0E;">
  <div style="max-width:720px;margin:0 auto;padding:32px 20px;">
    <div style="background:#2C1A0E;padding:24px 28px;border-radius:12px 12px 0 0;">
      <div style="font-size:20px;color:#E8D5C0;font-weight:500;">Coaching Services Invoice</div>
      <div style="font-size:11px;color:#8B6B47;letter-spacing:0.12em;text-transform:uppercase;margin-top:6px;">CKO Global INC &middot; Kelli Owens</div>
    </div>
    <div style="background:#FFFFFF;border:1px solid #E8DDD0;border-top:none;padding:28px;border-radius:0 0 12px 12px;">
      <table style="width:100%;font-size:13px;line-height:1.8;color:#4A3220;border-collapse:collapse;margin-bottom:22px;">
        <tr>
          <td style="vertical-align:top;">
            <strong style="color:#2C1A0E;">Invoice #:</strong> ${escapeHtml(invoiceNum)}<br>
            <strong style="color:#2C1A0E;">Date:</strong> ${escapeHtml(now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }))}<br>
            <strong style="color:#2C1A0E;">Period:</strong> ${escapeHtml(fromDate)} &ndash; ${escapeHtml(toDate)}
          </td>
          <td style="vertical-align:top;text-align:right;">
            <strong style="color:#2C1A0E;">Bill To:</strong> Loral Accounting<br>
            accounting@askloral.com<br>
            <span style="color:#9C8068;">From: Kelli Owens &middot; 346-628-5216</span>
          </td>
        </tr>
      </table>

      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#C4622D;margin:0 0 6px;">Billing Rates</div>
      <p style="margin:0 0 22px;font-size:12px;color:#6B4E35;line-height:1.7;">
        Pre-Call Prep: ${PREP_MINS} min @ $${PREP_RATE.toFixed(2)}/hr = $${PREP_COST.toFixed(2)} &nbsp;&middot;&nbsp;
        Coaching Call: ${CALL_MINS} min @ $${CALL_RATE.toFixed(2)}/hr = $${CALL_COST.toFixed(2)} &nbsp;&middot;&nbsp;
        <strong style="color:#2C1A0E;">$${TOTAL_PER.toFixed(2)} per session</strong>
      </p>

      <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#C4622D;margin:0 0 10px;">Itemized Sessions</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#2C1A0E;">
        <thead>
          <tr style="background:#2C1A0E;color:#E8D5C0;text-align:left;">
            <th style="padding:10px 8px;font-weight:500;">#</th>
            <th style="padding:10px 8px;font-weight:500;">Date</th>
            <th style="padding:10px 8px;font-weight:500;">Client</th>
            <th style="padding:10px 8px;font-weight:500;text-align:right;">Prep (${PREP_MINS}m)</th>
            <th style="padding:10px 8px;font-weight:500;text-align:right;">Call (${CALL_MINS}m)</th>
            <th style="padding:10px 8px;font-weight:500;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${htmlRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:12px 8px;text-align:right;color:#6B4E35;">Subtotals (${lineItems.length} session${lineItems.length === 1 ? "" : "s"})</td>
            <td style="padding:12px 8px;text-align:right;color:#6B4E35;white-space:nowrap;">$${(lineItems.length * PREP_COST).toFixed(2)}</td>
            <td style="padding:12px 8px;text-align:right;color:#6B4E35;white-space:nowrap;">$${(lineItems.length * CALL_COST).toFixed(2)}</td>
            <td style="padding:12px 8px;text-align:right;color:#6B4E35;white-space:nowrap;">$${grandTotal.toFixed(2)}</td>
          </tr>
          <tr style="background:#F3EBDF;">
            <td colspan="5" style="padding:16px 8px;text-align:right;font-size:15px;font-weight:bold;color:#2C1A0E;">AMOUNT DUE</td>
            <td style="padding:16px 8px;text-align:right;font-size:15px;font-weight:bold;color:#3D7A5C;white-space:nowrap;">$${grandTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <p style="margin:20px 0 0;font-size:12px;color:#6B4E35;">Payment due within 30 days of invoice date.</p>
      <hr style="border:0;border-top:1px solid #E8DDD0;margin:24px 0 12px;">
      <p style="margin:0;font-size:11px;color:#9C8068;">Generated automatically via TalkToKelli.com Coaching Invoice System</p>
    </div>
  </div>
</body></html>`;

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
        html: htmlBody,
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
