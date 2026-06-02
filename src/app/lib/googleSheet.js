// src/app/lib/googleSheet.js
import { google } from "googleapis";
import { formatISTDateTime } from "./dateTime";
import { cleanPhone10 } from "./phone";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function parseISTSheetTimestamp(value) {
  const text = String(value || "").trim();
  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)$/i
  );

  if (!match) return null;

  const [, day, month, year, rawHour, minute, second, meridiem] = match;
  let hour = Number(rawHour) % 12;
  if (meridiem.toLowerCase() === "pm") hour += 12;

  const timestamp =
    Date.UTC(Number(year), Number(month) - 1, Number(day), hour, Number(minute), Number(second)) -
    IST_OFFSET_MS;

  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeStoredPhone(value) {
  try {
    return cleanPhone10(value);
  } catch {
    return "";
  }
}

function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth.getClient();
}

async function getSheets() {
  const client = await getAuthClient();
  return google.sheets({ version: "v4", auth: client });
}

// ✅ Append full row A:O and return inserted row number
export async function saveToSheet({
  name,
  email,
  phone,
  source,
  webinarDay,
  webinarDate,
  webinarTime,
  webinarISO,
  leadId,
}) {
  const sheets = await getSheets();

  const values = [[
    formatISTDateTime(), // A Timestamp
    name,                               // B
    email,                              // C
    phone,                              // D (10 digit only)
    source,                             // E
    webinarDay || "",                   // F
    webinarDate || "",                  // G
    webinarTime || "",                  // H
    webinarISO || "",                   // I
    "no",                               // J sentConfirmation
    "no",                               // K sent2Day
    "no",                               // L sentMorning
    "no",                               // M sent10Min
    "no",                               // N sentLive
    leadId || "",                       // O leadId
  ]];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Sheet1!A:O",
    valueInputOption: "RAW",
    requestBody: { values },
  });

  // Example updatedRange: "Sheet1!A12:O12"
  const updatedRange = res.data?.updates?.updatedRange || "";
  const match = updatedRange.match(/!A(\d+):/);
  const rowNumber = match ? Number(match[1]) : null;

  return { success: true, rowNumber };
}

// Find row number by leadId stored in column O
export async function findRowByLeadId(leadId) {
  if (!leadId) return null;
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Sheet1!O:O",
  });

  const rows = res.data.values || [];
  // rows[0] is header
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i]?.[0] || "") === String(leadId)) {
      return i + 1; // sheet row number
    }
  }
  return null;
}

// ✅ Mark a single cell (e.g. J12 = "yes")
// Find a matching lead submitted during the last week.
export async function findExistingLeadRow({ phone10, email }) {
  const p = String(phone10 || "").trim();
  const e = String(email || "")
    .trim()
    .toLowerCase();

  if (!p && !e) return null;

  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    // A=timestamp, C=email, D=phone. Start at row 2 to skip headers.
    range: "Sheet1!A2:D",
  });

  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    const submittedAt = parseISTSheetTimestamp(rows[i]?.[0]);
    const rowEmail = String(rows[i]?.[2] || "")
      .trim()
      .toLowerCase();
    const rowPhone = normalizeStoredPhone(rows[i]?.[3]);
    const matchedBy = p && rowPhone === p ? "phone" : e && rowEmail === e ? "email" : null;

    if (matchedBy && (submittedAt === null || Date.now() - submittedAt < WEEK_MS)) {
      return {
        rowNumber: i + 2, // because we started at row 2
        matchedBy,
      };
    }
  }

  return null;
}

export async function markCell(rowNumber, columnLetter, value, sheetName = "Sheet1") {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!${columnLetter}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });

  return { success: true };
}

// ✅ Read all leads (rows after header)
export async function readAllLeads() {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Sheet1!A:O",
  });

  const rows = res.data.values || [];
  return rows.slice(1); // remove header row
}

export async function saveCoursePurchaseToSheet2({
  name,
  email,
  phone,
  courseName,
  price,
  paymentStatus,
  paymentId,
  orderId,
  invoiceNumber,
  invoiceDate,
}) {
  const sheets = await getSheets();

  const values = [[
    invoiceDate || formatISTDateTime(),
    name || "",
    email || "",
    phone || "",
    courseName || "Price Behaviour Mastery",
    String(price || ""),
    paymentStatus || "",
    paymentId || "",
    orderId || "",
    invoiceNumber || "",
  ]];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Sheet2!A:J",
    valueInputOption: "RAW",
    requestBody: { values },
  });

  // Example updatedRange: "Sheet2!A12:J12"
  const updatedRange = res.data?.updates?.updatedRange || "";
  const match = updatedRange.match(/!A(\d+):/);
  const rowNumber = match ? Number(match[1]) : null;

  return { success: true, rowNumber };
}
