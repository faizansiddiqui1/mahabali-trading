// src/app/lib/mart2meta.js
import { cleanPhone10 } from "./phone.js";

const MART2META_API_BASE_URL = process.env.MART2META_API_BASE_URL || "https://login.mart2meta.com/api";
const MART2META_UID = process.env.MART2META_UID || "";
const MART2META_API_TOKEN = process.env.MART2META_API_TOKEN || "";
const MART2META_PHONE_NUMBER_ID = process.env.MART2META_PHONE_NUMBER_ID || "";
const MART2META_TEMPLATE_LANGUAGE = process.env.MART2META_TEMPLATE_LANGUAGE || "en";
const MART2META_DEBUG = process.env.MART2META_DEBUG === "true";
const WEBINAR_LINK = process.env.WEBINAR_LINK || "";

function maskUid(uid) {
    const str = String(uid || "");
    if (!str) return "";
    if (str.length <= 8) return `${str.slice(0, 2)}***`;
    return `${str.slice(0, 4)}****${str.slice(-4)}`;
}

function required(name, value) {
    const normalized =
        typeof value === "string" ? value.trim() : value;

    if (!normalized) {
        throw new Error(`Missing required env: ${name}`);
    }
    return normalized;
}

function resolvePublicUrlMaybe(relativeOrAbsoluteUrl) {
    let raw = typeof relativeOrAbsoluteUrl === "string" ? relativeOrAbsoluteUrl.trim() : "";
    if (!raw) return "";
    // strip wrapping quotes if user saved value like "https://example.com/video.mp4"
    raw = raw.replace(/^['"]|['"]$/g, "");

    // Already absolute
    if (/^https?:\/\//i.test(raw)) return raw;

    // Protocol-relative -> normalize to https
    if (/^\/\//.test(raw)) return `https:${raw}`;

    // "/file.mp4" -> needs a public site base
    if (raw.startsWith("/")) {
        let base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim();
        base = base.replace(/^['"]|['"]$/g, "");
        base = base.replace(/\/+$/, "");
        if (!base || !/^https?:\/\//i.test(base)) {
            throw new Error(
                `Media URL "${raw}" is relative but NEXT_PUBLIC_SITE_URL/SITE_URL is missing or invalid. Set NEXT_PUBLIC_SITE_URL to a public https URL (e.g. https://mahabalipriceaction.com).`
            );
        }
        raw = `${base}${raw}`;
    }

    // Bare host/path without protocol -> assume https
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

    // Validate URI shape early (Meta rejects many invalid/encoded forms)
    try {
        const parsed = new URL(raw);
        if (!/^https?:$/.test(parsed.protocol)) throw new Error("Invalid protocol");
    } catch {
        throw new Error(`Invalid public media URL: ${raw}`);
    }

    return raw;
}

function asInternationalPhone(input) {
    const phone10 = cleanPhone10(input);
    return `91${phone10}`;
}

function endpoint(path) {
    const base = MART2META_API_BASE_URL.replace(/\/+$/, "");
    const uid = required("MART2META_UID", MART2META_UID);
    return `${base}/${uid}${path}`;
}

function toParameterString(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return "";
    }

    return values
        .map((value) => {
            let clean = String(value ?? "").replace(/[{}]/g, "").trim();
            // WhatsApp template text parameters must not be empty — use a safe placeholder
            // when a value is missing to avoid "Parameter of type text is missing text value" errors.
            if (!clean) clean = "-";
            return `{${clean}}`;
        })
        .join(",");
}

function maskValue(value) {
    const str = String(value ?? "");
    if (!str) return "";
    if (/^\d{8,}$/.test(str)) return `${str.slice(0, 3)}*****${str.slice(-2)}`;
    if (str.includes("@")) {
        const [user, domain] = str.split("@");
        const left = user.length <= 2 ? `${user[0] || ""}*` : `${user[0]}***${user.slice(-1)}`;
        return `${left}@${domain}`;
    }
    return str.length > 8 ? `${str.slice(0, 4)}****${str.slice(-2)}` : `${str[0] || ""}***`;
}

async function callMart2Meta({ path, payload, label }) {
    const url = endpoint(path);
    const token = required("MART2META_API_TOKEN", MART2META_API_TOKEN);

    if (MART2META_DEBUG) {
        console.log("Mart2Meta DEBUG", {
            label,
            url,
            phone: maskValue(payload?.phone_number),
            template: payload?.template_name,
            mediaType: payload?.template_media_type,
            hasUrl: Boolean(payload?.url),
            parameters: maskValue(payload?.parameters),
        });
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    const raw = await response.text();

    if (MART2META_DEBUG) {
        const snippet = String(raw || "").slice(0, 500);
        console.log("Mart2Meta DEBUG response", {
            label,
            httpStatus: response.status,
            ok: response.ok,
            bodySnippet: snippet,
        });
    }

    let data = null;
    try {
        data = JSON.parse(raw);
    } catch {
        data = null;
    }

    if (!response.ok) {
        const mediaHint = payload?.url ? ` mediaUrl=${maskValue(payload.url)}` : "";
        throw new Error(
            `Mart2Meta failed (${response.status}) [${label || "unknown"} template=${payload?.template_name || ""} lang=${payload?.template_language || ""} uid=${maskUid(MART2META_UID)} path=${path}]${mediaHint}: ${raw}`
        );
    }

    const lowered = String(raw || "").toLowerCase();
    const explicitFailure =
        data?.status === false ||
        data?.success === false ||
        data?.ok === false ||
        // Mart2Meta sometimes returns PHP/Laravel debug text with reaction_code/message
        // while still responding 200 OK.
        lowered.includes("invalid template id") ||
        lowered.includes("sync template") ||
        lowered.includes("reaction_code") ||
        lowered.includes("error") ||
        lowered.includes("failed");

    if (explicitFailure) {
        throw new Error(
            `Mart2Meta failed [${label || "unknown"} template=${payload?.template_name || ""} lang=${payload?.template_language || ""} uid=${maskUid(MART2META_UID)} path=${path}]: ${raw}`
        );
    }

    return { status: "success", data: data ?? raw };
}

async function sendTemplate({
    templateName,
    phone10,
    parameters,
    templateMediaType = "simple",
    mediaUrl,
    path = "/contact/send-template",
    label,
}) {
    const payload = {
        from_phone_number_id: required("MART2META_PHONE_NUMBER_ID", MART2META_PHONE_NUMBER_ID),
        phone_number: asInternationalPhone(phone10),
        template_name: templateName,
        template_language: MART2META_TEMPLATE_LANGUAGE,
        template_media_type: templateMediaType,
    };

    const needsMedia = ["video", "image", "document"].includes(String(templateMediaType || "").toLowerCase());

    if (typeof mediaUrl === "string" && mediaUrl.trim()) {
        payload.url = resolvePublicUrlMaybe(mediaUrl);
    } else if (needsMedia) {
        throw new Error(
            `Missing mediaUrl for media template. Set MART2META_TEMPLATE_*_MEDIA_URL to a public https URL (or use "/file" with NEXT_PUBLIC_SITE_URL).`
        );
    }

    if (Array.isArray(parameters)) {
        payload.parameters = toParameterString(parameters);
    }

    return callMart2Meta({ path, payload, label });
}

export async function sendConfirmation({
    name,
    email,
    phone10,
    webinarMeta,
    communityUrl = process.env.MART2META_TEMPLATE_CONFIRM_COMMUNITY_URL || process.env.WHATSAPP_COMMUNITY_URL || "",
    templateMediaType = process.env.MART2META_TEMPLATE_CONFIRM_MEDIA_TYPE || "simple",
    mediaUrl,
}) {
    return sendTemplate({
        label: "confirmation",
        templateName: required("MART2META_TEMPLATE_CONFIRM", process.env.MART2META_TEMPLATE_CONFIRM),
        phone10,
        templateMediaType,
        mediaUrl: mediaUrl || process.env.MART2META_TEMPLATE_CONFIRM_MEDIA_URL,
        parameters: [
            name,
            webinarMeta?.webinarDate,
            webinarMeta?.webinarDay,
            webinarMeta?.webinarTime,
            communityUrl,
        ],
    });
}

export async function sendCoursePurchaseWhatsApp({
    name,
    email,
    phone10,
    courseName,
    whatsappCommunityUrl,
    templateMediaType = process.env.MART2META_TEMPLATE_COURSE_PURCHASE_MEDIA_TYPE || "simple",
    mediaUrl,
}) {
    return sendTemplate({
        label: "course-purchase",
        templateName: required(
            "MART2META_TEMPLATE_COURSE_PURCHASE",
            process.env.MART2META_TEMPLATE_COURSE_PURCHASE
        ),
        phone10,
        templateMediaType,
        mediaUrl: mediaUrl || process.env.MART2META_TEMPLATE_COURSE_PURCHASE_MEDIA_URL,
        // Template `course_purchase_confirmation_v01` is configured for 2 params:
        // 1) name 2) course community link
        parameters: [name, whatsappCommunityUrl],
    });
}

export async function send2DayReminder({
    name,
    phone10,
    instagramUrl = process.env.MART2META_TEMPLATE_2DAY_INSTAGRAM_URL || "",
    youtubeUrl = process.env.MART2META_TEMPLATE_2DAY_YOUTUBE_URL || "",
    templateMediaType = process.env.MART2META_TEMPLATE_2DAY_MEDIA_TYPE || "video",
    mediaUrl,
}) {
    return sendTemplate({
        label: "2day-reminder",
        templateName: required("MART2META_TEMPLATE_2DAY", process.env.MART2META_TEMPLATE_2DAY),
        phone10,
        templateMediaType,
        mediaUrl: mediaUrl || process.env.MART2META_TEMPLATE_2DAY_MEDIA_URL,
        parameters: [name, instagramUrl, youtubeUrl],
    });
}

export async function sendMorningReminder({
    name,
    phone10,
    webinarDate,
    webinarDay,
    webinarTime,
    webinarLink = WEBINAR_LINK,
    templateMediaType = process.env.MART2META_TEMPLATE_MORNING_MEDIA_TYPE || "simple",
    mediaUrl,
}) {
    return sendTemplate({
        label: "morning-reminder",
        templateName: required("MART2META_TEMPLATE_MORNING", process.env.MART2META_TEMPLATE_MORNING),
        phone10,
        templateMediaType,
        mediaUrl: mediaUrl || process.env.MART2META_TEMPLATE_MORNING_MEDIA_URL,
        parameters: [name, webinarDate, webinarDay, webinarTime, webinarLink],
    });
}

export async function sendDayLinkReminder({
    name,
    phone10,
    webinarDate,
    webinarDay,
    webinarTime,
    webinarLink = WEBINAR_LINK,
    communityUrl = process.env.MART2META_TEMPLATE_CONFIRM_COMMUNITY_URL || process.env.WHATSAPP_COMMUNITY_URL || "",
    templateMediaType = process.env.MART2META_TEMPLATE_DAY_LINK_MEDIA_TYPE || process.env.MART2META_TEMPLATE_MORNING_MEDIA_TYPE || "simple",
    mediaUrl,
}) {
    return sendTemplate({
        label: "day-link-reminder",
        templateName: required(
            "MART2META_TEMPLATE_DAY_LINK",
            process.env.MART2META_TEMPLATE_DAY_LINK || process.env.MART2META_TEMPLATE_MORNING
        ),
        phone10,
        templateMediaType,
        mediaUrl:
            mediaUrl ||
            process.env.MART2META_TEMPLATE_DAY_LINK_MEDIA_URL ||
            process.env.MART2META_TEMPLATE_MORNING_MEDIA_URL,
        parameters: [name, webinarDate, webinarDay, webinarTime, webinarLink, communityUrl],
    });
}

export async function send10MinReminder({
    name,
    phone10,
    webinarTime,
    webinarLink = WEBINAR_LINK,
    templateMediaType = process.env.MART2META_TEMPLATE_10MIN_MEDIA_TYPE || "video",
    mediaUrl,
}) {
    return sendTemplate({
        label: "10min-reminder",
        templateName: required("MART2META_TEMPLATE_10MIN", process.env.MART2META_TEMPLATE_10MIN),
        phone10,
        templateMediaType,
        mediaUrl: mediaUrl || process.env.MART2META_TEMPLATE_10MIN_MEDIA_URL,
        parameters: [name, webinarTime, webinarLink],
    });
}

export async function sendLiveNow({
    name,
    phone10,
    webinarDate,
    webinarDay,
    webinarTime,
    webinarLink = WEBINAR_LINK,
    templateMediaType = process.env.MART2META_TEMPLATE_LIVE_MEDIA_TYPE || "video",
    mediaUrl,
}) {
    return sendTemplate({
        label: "live-now",
        templateName: required("MART2META_TEMPLATE_LIVE", process.env.MART2META_TEMPLATE_LIVE),
        phone10,
        templateMediaType,
        mediaUrl: mediaUrl || process.env.MART2META_TEMPLATE_LIVE_MEDIA_URL,
        parameters: [name, webinarDate, webinarDay, webinarTime, webinarLink],
    });
}

export async function sendCustomTemplateMessage({
    phone10,
    templateName,
    templateLanguage = MART2META_TEMPLATE_LANGUAGE,
    templateMediaType = "simple",
    mediaUrl,
    parameters = [],
    useTemplateMessageEndpoint = false,
}) {
    const payload = {
        from_phone_number_id: required("MART2META_PHONE_NUMBER_ID", MART2META_PHONE_NUMBER_ID),
        phone_number: asInternationalPhone(phone10),
        template_name: templateName,
        template_language: templateLanguage,
        template_media_type: templateMediaType,
    };

    if (mediaUrl) payload.url = mediaUrl;
    if (Array.isArray(parameters)) payload.parameters = toParameterString(parameters);

    return callMart2Meta({
        path: useTemplateMessageEndpoint ? "/contact/send-template-message" : "/contact/send-template",
        payload,
        label: "custom-template",
    });
}

export function buildTemplatePayload({
    templateName,
    phone10,
    parameters,
    templateMediaType = "simple",
    mediaUrl,
    path = "/contact/send-template",
    templateLanguage = MART2META_TEMPLATE_LANGUAGE,
}) {
    const payload = {
        from_phone_number_id: required("MART2META_PHONE_NUMBER_ID", MART2META_PHONE_NUMBER_ID),
        phone_number: asInternationalPhone(phone10),
        template_name: templateName,
        template_language: templateLanguage,
        template_media_type: templateMediaType,
    };

    const needsMedia = ["video", "image", "document"].includes(String(templateMediaType || "").toLowerCase());

    if (typeof mediaUrl === "string" && mediaUrl.trim()) {
        payload.url = resolvePublicUrlMaybe(mediaUrl);
    } else if (needsMedia) {
        throw new Error(
            `Missing mediaUrl for media template. Set MART2META_TEMPLATE_*_MEDIA_URL to a public https URL (or use "/file" with NEXT_PUBLIC_SITE_URL).`
        );
    }

    if (Array.isArray(parameters)) {
        payload.parameters = toParameterString(parameters);
    }

    return payload;
}
