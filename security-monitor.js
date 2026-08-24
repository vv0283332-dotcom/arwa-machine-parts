import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const eventsFile = path.join(dataDir, "security-events.json");

fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(eventsFile)) {
  fs.writeFileSync(eventsFile, "[]");
}

function getEvents() {
  try {
    return JSON.parse(fs.readFileSync(eventsFile, "utf8"));
  } catch {
    return [];
  }
}

export async function securityAlert({
  type,
  req,
  details = {}
}) {
  const event = {
    id: "SEC-" + Date.now().toString(36).toUpperCase(),
    type,
    time: new Date().toISOString(),
    ip:
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown",
    method: req.method,
    path: req.originalUrl,
    userAgent: req.headers["user-agent"] || "unknown",
    details
  };

  const events = getEvents();

  events.unshift(event);

  fs.writeFileSync(
    eventsFile,
    JSON.stringify(events.slice(0, 1000), null, 2)
  );

  console.log(
    `[SECURITY] ${event.type} | ${event.ip} | ${event.method} ${event.path}`
  );

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return event;
  }

  const message =
`🚨 ARWA SECURITY ALERT

Type: ${event.type}
IP: ${event.ip}
Method: ${event.method}
Path: ${event.path}
Time: ${event.time}

User-Agent:
${event.userAgent}

Details:
${JSON.stringify(details, null, 2)}`;

  try {
    await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }
    );
  } catch (error) {
    console.error(
      "[SECURITY] Telegram notification failed:",
      error.message
    );
  }

  return event;
}
