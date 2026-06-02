// src/app/api/whatsapp/route.js
import { NextResponse } from "next/server";
import { cleanPhone10 } from "../../lib/phone";
import { validateForm } from "../../lib/validate";
import { saveToSheet, markCell, findExistingLeadRow } from "../../lib/googleSheet";
import { sendConfirmation, send2DayReminder, sendMorningReminder, send10MinReminder, sendLiveNow } from "../../lib/mart2meta";
import { getQstashTargetUrl, publishScheduled, toEpochSeconds } from "../../lib/qstash";
import fs from "fs";

// Column J = sentConfirmation
const COL_LETTER_SENT_CONFIRM = "J";
const IST_OFFSET_MIN = 5 * 60 + 30;

const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseWebinarDate(dateStr) {
  const clean = String(dateStr || "").trim().replace(/,/g, "");
  const match = clean.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const monthKey = match[2].slice(0, 3).toLowerCase();
  const year = Number(match[3]);
  const monthIdx = MONTHS[monthKey];
  if (!Number.isFinite(day) || !Number.isFinite(year) || monthIdx === undefined) return null;
  return { year, monthIdx, day };
}

function parseWebinarTime(timeStr) {
  const clean = String(timeStr || "").trim().toUpperCase();
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  const meridiem = match[3] || "";

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (hour === 12) hour = 0;
    if (meridiem === "PM") hour += 12;
  }

  return { hour, minute };
}

function buildWebinarISO({ webinarDate, webinarTime }) {
  const dateParts = parseWebinarDate(webinarDate);
  const timeParts = parseWebinarTime(webinarTime);

  if (dateParts && timeParts) {
    const utcMs =
      Date.UTC(dateParts.year, dateParts.monthIdx, dateParts.day, timeParts.hour, timeParts.minute) -
      IST_OFFSET_MIN * 60 * 1000;
    return new Date(utcMs).toISOString();
  }

  // Fallback to native parsing if format is unexpected
  const dt = new Date(`${webinarDate} ${webinarTime} GMT+0530`);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function buildWebinarMorningISO(webinarDate) {
  const dateParts = parseWebinarDate(webinarDate);

  if (dateParts) {
    const utcMs =
      Date.UTC(dateParts.year, dateParts.monthIdx, dateParts.day, 8, 0) - IST_OFFSET_MIN * 60 * 1000;
    return new Date(utcMs).toISOString();
  }

  const dt = new Date(`${webinarDate} 08:00 GMT+0530`);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function buildSecondDayReminderISOFromNow() {
  const IST_OFFSET_MS = IST_OFFSET_MIN * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const nowUtcMs = Date.now();
  const nowIst = new Date(nowUtcMs + IST_OFFSET_MS);
  const istWeekday = nowIst.getUTCDay(); // 0=Sun ... 6=Sat

  // Saturday form-fill: send this reminder 2 hours after confirmation.
  if (istWeekday === 6) {
    return new Date(nowUtcMs + 2 * 60 * 60 * 1000).toISOString();
  }

  let daysToAdd = 3;
  if (istWeekday === 4) daysToAdd = 2; // Thu -> Sat
  if (istWeekday === 5) daysToAdd = 1; // Fri -> Sat

  const targetIstDate = new Date(Date.UTC(
    nowIst.getUTCFullYear(),
    nowIst.getUTCMonth(),
    nowIst.getUTCDate()
  ) + daysToAdd * DAY_MS);

  const utcMs =
    Date.UTC(
      targetIstDate.getUTCFullYear(),
      targetIstDate.getUTCMonth(),
      targetIstDate.getUTCDate(),
      8,
      0
    ) - IST_OFFSET_MS;

  return new Date(utcMs).toISOString();
}

export async function POST(req) {
  try {
    // Read REMINDER_TEST_MODE dynamically from .env in development so toggling
    // the file does not require restarting the dev server. Falls back to
    // process.env if .env is missing or the key is not present.
    function readEnvValueFromDotEnv(key) {
      try {
        const envPath = `${process.cwd()}/.env`;
        if (!fs.existsSync(envPath)) return undefined;
        const raw = fs.readFileSync(envPath, "utf8");
        const lines = raw.split(/\r?\n/);
        for (const line of lines) {
          const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
          if (!m) continue;
          if (m[1] !== key) continue;
          let val = m[2] || "";
          val = val.trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          return val;
        }
        return undefined;
      } catch (err) {
        console.error("Error reading .env:", err.message || err);
        return undefined;
      }
    }

    const body = await req.json();

    // basic validations + normalization
    const normalized = validateForm(body);

    const phone10 = cleanPhone10(normalized.phone);

    const webinarDay = normalized.webinarDay || "";
    const webinarDate = normalized.webinarDate || "";
    const webinarTime = normalized.webinarTime || "";
    const confirmationMediaUrl = String(body?.confirmationMediaUrl || body?.mediaUrl || "").trim();
    const confirmationMediaType = String(body?.confirmationMediaType || body?.mediaType || "").trim();
    const reminderMediaUrl = String(body?.reminderMediaUrl || "").trim();
    const reminderMediaType = String(body?.reminderMediaType || "").trim();

    if (!webinarDate || !webinarTime) {
      return NextResponse.json(
        { success: false, message: "webinarDate and webinarTime are required" },
        { status: 400 }
      );
    }

    const webinarISO = buildWebinarISO({ webinarDate, webinarTime });

    if (!webinarISO) {
      return NextResponse.json(
        { success: false, message: "webinarISO missing / invalid webinar date-time" },
        { status: 400 }
      );
    }

    // Allow one free webinar registration per phone/email every 7 days.
    const existing = await findExistingLeadRow({
      phone10,
      email: normalized.email,
    });
    if (existing?.rowNumber) {
      return NextResponse.json(
        { success: false, message: "You have already submitted form this week. Please try again after 7 days." },
        { status: 409 }
      );
    }

    const leadId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
      .replace(/[^\w-]/g, "");

    // save row first (A:M)
    const { rowNumber } = await saveToSheet({
      name: normalized.name,
      email: normalized.email,
      phone: phone10,
      source: process.env.NODE_ENV === "production" ? "website-prod" : "website-local",
      webinarDay,
      webinarDate,
      webinarTime,
      webinarISO,
      leadId,
    });

    // send confirmation
    await sendConfirmation({
      name: normalized.name,
      email: normalized.email,
      phone10,
      webinarMeta: { webinarDay, webinarDate, webinarTime, webinarISO },
      mediaUrl: confirmationMediaUrl || undefined,
      templateMediaType: confirmationMediaType || undefined,
    });

    // Message sent successfully -> mark immediately (don't block on QStash scheduling)
    if (rowNumber) {
      await markCell(rowNumber, COL_LETTER_SENT_CONFIRM, "yes");
    }

    // schedule reminders via QStash or, when testing, send immediately
    const rawReminderMode = String(readEnvValueFromDotEnv("REMINDER_TEST_MODE") ?? process.env.REMINDER_TEST_MODE ?? "");
    let reminderTestMode = rawReminderMode.toLowerCase() === "true";

    // Safety: when running in production, force scheduling (QStash) unless
    // an explicit override `ALLOW_IMMEDIATE_REMINDERS=true` is set.
    if (
      process.env.NODE_ENV === "production" &&
      String(process.env.ALLOW_IMMEDIATE_REMINDERS || "").toLowerCase() !== "true"
    ) {
      if (reminderTestMode) {
        console.log("Overriding REMINDER_TEST_MODE in production: forcing QStash scheduling unless ALLOW_IMMEDIATE_REMINDERS=true");
      }
      reminderTestMode = false;
    }

    console.log("REMINDER mode", { rawReminderMode, reminderTestMode, nodeEnv: process.env.NODE_ENV });

    if (rowNumber) {
      if (reminderTestMode) {
        // Send all reminders immediately (useful for local testing). Each send is isolated
        // so one failure doesn't stop the rest.
        try {
          try {
            await send2DayReminder({
              name: normalized.name,
              phone10,
              templateMediaType: reminderMediaType || undefined,
              mediaUrl: reminderMediaUrl || undefined,
            });
            await markCell(rowNumber, "K", "yes");
            console.log("IMMEDIATE SENT 2DAY", { rowNumber });
          } catch (err) {
            console.error("Immediate 2day error:", err);
          }

          try {
            await sendMorningReminder({
              name: normalized.name,
              phone10,
              webinarDate,
              webinarDay,
              webinarTime,
              templateMediaType: reminderMediaType || undefined,
              mediaUrl: reminderMediaUrl || undefined,
            });
            await markCell(rowNumber, "L", "yes");
            console.log("IMMEDIATE SENT MORNING", { rowNumber });
          } catch (err) {
            console.error("Immediate morning error:", err);
          }

          try {
            await send10MinReminder({
              name: normalized.name,
              phone10,
              webinarTime,
              templateMediaType: reminderMediaType || undefined,
              mediaUrl: reminderMediaUrl || undefined,
            });
            await markCell(rowNumber, "M", "yes");
            console.log("IMMEDIATE SENT 10MIN", { rowNumber });
          } catch (err) {
            console.error("Immediate 10min error:", err);
          }

          try {
            await sendLiveNow({
              name: normalized.name,
              phone10,
              webinarDate,
              webinarDay,
              webinarTime,
              templateMediaType: reminderMediaType || undefined,
              mediaUrl: reminderMediaUrl || undefined,
            });
            await markCell(rowNumber, "N", "yes");
            console.log("IMMEDIATE SENT LIVE", { rowNumber });
          } catch (err) {
            console.error("Immediate live error:", err);
          }
        } catch (err) {
          console.error("Immediate reminders error:", err);
        }
      } else {
        try {
          const baseUrl = getQstashTargetUrl(req.url, req.headers);
          const receiverUrl = `${baseUrl}/api/qstash`;
          const parsed = new URL(receiverUrl);
          if (!/^https?:$/.test(parsed.protocol)) {
            throw new Error("Invalid protocol");
          }
          // Upstash QStash rejects loopback/private localhost destinations.
          // If you're testing locally, set REMINDER_TEST_MODE=true (skip scheduling)
          // or set QSTASH_TARGET_URL to a public tunnel/domain.
          const host = (parsed.hostname || "").toLowerCase();
          if (
            host === "localhost" ||
            host === "127.0.0.1" ||
            host === "::1" ||
            host === "[::1]"
          ) {
            throw new Error(
              `QStash destination resolves to loopback (${parsed.hostname}). Set QSTASH_TARGET_URL to a public URL or enable REMINDER_TEST_MODE=true.`
            );
          }

          const secondDayReminderISO = buildSecondDayReminderISOFromNow();
          const secondDayEpoch = toEpochSeconds(secondDayReminderISO);
          const morningWebinarISO = buildWebinarMorningISO(webinarDate);
          if (!morningWebinarISO) throw new Error("Invalid morning webinar ISO");
          const morningEpoch = toEpochSeconds(morningWebinarISO);
          const webinarTs = new Date(webinarISO).getTime();
          if (Number.isNaN(webinarTs)) throw new Error("Invalid webinarISO");
          const tenMinEpoch = toEpochSeconds(new Date(webinarTs - 10 * 60 * 1000).toISOString());
          const liveEpoch = toEpochSeconds(new Date(webinarTs).toISOString());

          const payload = {
            rowNumber,
            leadId,
            name: normalized.name,
            email: normalized.email,
            phone10,
            webinarDay,
            webinarDate,
            webinarTime,
            webinarISO,
            reminderMediaUrl: reminderMediaUrl || undefined,
            reminderMediaType: reminderMediaType || undefined,
          };

          await publishScheduled({
            url: receiverUrl,
            body: { type: "2day", ...payload },
            notBeforeEpochSeconds: secondDayEpoch,
          });
          await publishScheduled({
            url: receiverUrl,
            body: { type: "morning", ...payload },
            notBeforeEpochSeconds: morningEpoch,
          });
          await publishScheduled({
            url: receiverUrl,
            body: { type: "10min", ...payload },
            notBeforeEpochSeconds: tenMinEpoch,
          });
          await publishScheduled({
            url: receiverUrl,
            body: { type: "live", ...payload },
            notBeforeEpochSeconds: liveEpoch,
          });
        } catch (err) {
          // Don't fail the whole form submission if reminders scheduling fails.
          console.error("QStash scheduling error:", err);
        }
      }
    }

    return NextResponse.json({ success: true, message: "Form submitted successfully!" });
  } catch (error) {
    console.error("API Error:", error);
    const raw = String(error?.message || "");
    let safeMessage = "Something went wrong. Please try again.";
    if (raw.toLowerCase().includes("insufficient whatsapp conversation credits")) {
      safeMessage = "We are facing some issue. Please try again later.";
    } else if (raw.toLowerCase().includes("template not found")) {
      safeMessage =
        "WhatsApp template is not configured correctly. Please try again later.";
    } else if (raw.toLowerCase().includes("invalid phone")) {
      safeMessage = "Please enter a valid 10-digit phone number.";
    } else if (raw.toLowerCase().includes("webinar")) {
      safeMessage = "Please refresh the page and try again.";
    }
    return NextResponse.json(
      { success: false, message: safeMessage },
      { status: 400 }
    );
  }
}
