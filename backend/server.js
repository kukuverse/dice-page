const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const BACKEND_DIR = __dirname;
const PROJECT_DIR = path.resolve(BACKEND_DIR, "..");
const FRONTEND_DIR = path.join(PROJECT_DIR, "frontend");
const DATA_DIR = path.join(BACKEND_DIR, "data");
const UPLOADS_DIR = path.join(BACKEND_DIR, "uploads");
const PORT = Number(process.env.PORT || 4173);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "kukuverse-admin";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || "";
const sessions = new Map();
const contentClients = new Set();

const files = {
  joins: path.join(DATA_DIR, "joins.json"),
  messages: path.join(DATA_DIR, "messages.json"),
  content: path.join(DATA_DIR, "content.json"),
  campaigns: path.join(DATA_DIR, "campaigns.json")
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, file);
}

function sendJson(res, status, value, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(JSON.stringify(value));
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      })
  );
}

function isAdmin(req) {
  const token = parseCookies(req).kukuverse_admin;
  return Boolean(token && sessions.has(token));
}

function requireAdmin(req, res) {
  if (isAdmin(req)) {
    return true;
  }

  sendJson(res, 401, { error: "Admin authentication required." });
  return false;
}

function readBody(req, maxBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}

function clean(value, maxLength = 5000) {
  return String(value || "").trim().slice(0, maxLength);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createRecord(data) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "new",
    ...data
  };
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function safeUploadExtension(mimeType) {
  return {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif"
  }[mimeType] || "";
}

function removeLocalUpload(value) {
  if (!String(value || "").startsWith("/uploads/")) {
    return;
  }

  const fileName = path.basename(value);
  const filePath = path.join(UPLOADS_DIR, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function sanitizeContentStyle(style) {
  if (!style || typeof style !== "object") {
    return undefined;
  }

  const result = {};
  const fontSize = clean(style.fontSize, 20);
  const fontWeight = clean(style.fontWeight, 20);
  const fontStyle = clean(style.fontStyle, 20);
  const color = clean(style.color, 20).toLowerCase();

  if (/^\d{1,3}px$/.test(fontSize)) {
    result.fontSize = fontSize;
  }

  if (new Set(["400", "500", "600", "700"]).has(fontWeight)) {
    result.fontWeight = fontWeight;
  }

  if (new Set(["normal", "italic"]).has(fontStyle)) {
    result.fontStyle = fontStyle;
  }

  if (/^#[0-9a-f]{6}$/.test(color)) {
    result.color = color;
  }

  return Object.keys(result).length ? result : undefined;
}

function sanitizeStoryCreateItems(entry, existingEntry) {
  const nextItems = Array.isArray(entry?.items) ? entry.items : [];
  const previousItems = Array.isArray(existingEntry?.items) ? existingEntry.items : [];
  const previousById = new Map(previousItems.map((item) => [item.id, item]));

  const items = nextItems.map((item, index) => {
    const previousItem = previousById.get(clean(item?.id, 80)) || {};
    const nextImage = clean(item?.image, 20000);

    if (previousItem.image && previousItem.image !== nextImage) {
      removeLocalUpload(previousItem.image);
    }

    return {
      id: clean(item?.id, 80) || crypto.randomUUID(),
      navLabel: clean(item?.navLabel, 120) || `Item ${index + 1}`,
      navStyle: sanitizeContentStyle(item?.navStyle),
      title: clean(item?.title, 200),
      titleStyle: sanitizeContentStyle(item?.titleStyle),
      description: clean(item?.description, 5000),
      descriptionStyle: sanitizeContentStyle(item?.descriptionStyle),
      image: nextImage
    };
  });

  previousItems.forEach((item) => {
    if (!items.some((nextItem) => nextItem.id === item.id)) {
      removeLocalUpload(item.image);
    }
  });

  return {
    ...existingEntry,
    items
  };
}

function sanitizeIndexHeroGallery(entry, existingEntry) {
  const nextItems = Array.isArray(entry?.items) ? entry.items : [];
  const previousItems = Array.isArray(existingEntry?.items) ? existingEntry.items : [];
  const previousById = new Map(previousItems.map((item) => [item.id, item]));

  const items = nextItems.map((item, index) => {
    const previousItem = previousById.get(clean(item?.id, 80)) || {};
    const nextImage = clean(item?.image, 20000);

    if (previousItem.image && previousItem.image !== nextImage) {
      removeLocalUpload(previousItem.image);
    }

    return {
      id: clean(item?.id, 80) || crypto.randomUUID(),
      image: nextImage,
      alt: clean(item?.alt, 200) || `Vault X1 image ${index + 1}`
    };
  });

  previousItems.forEach((item) => {
    if (!items.some((nextItem) => nextItem.id === item.id)) {
      removeLocalUpload(item.image);
    }
  });

  return {
    ...existingEntry,
    items
  };
}

function sanitizeIndexArmoryItems(entry, existingEntry) {
  const nextItems = Array.isArray(entry?.items) ? entry.items : [];
  const previousItems = Array.isArray(existingEntry?.items) ? existingEntry.items : [];
  const previousById = new Map(previousItems.map((item) => [item.id, item]));

  const items = nextItems.map((item, index) => {
    const previousItem = previousById.get(clean(item?.id, 80)) || {};
    const nextImage = clean(item?.image, 20000);

    if (previousItem.image && previousItem.image !== nextImage) {
      removeLocalUpload(previousItem.image);
    }

    return {
      id: clean(item?.id, 80) || crypto.randomUUID(),
      image: nextImage,
      title: clean(item?.title, 200) || `Category ${index + 1}`,
      subtitle: clean(item?.subtitle, 200),
      alt: clean(item?.alt, 200) || clean(item?.title, 200) || `Armory item ${index + 1}`
    };
  });

  previousItems.forEach((item) => {
    if (!items.some((nextItem) => nextItem.id === item.id)) {
      removeLocalUpload(item.image);
    }
  });

  return {
    ...existingEntry,
    items
  };
}

function broadcastContentUpdate(pages) {
  const message = `event: content-update\ndata: ${JSON.stringify({
    pages: Object.keys(pages),
    updatedAt: new Date().toISOString()
  })}\n\n`;

  contentClients.forEach((client) => {
    client.write(message);
  });
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/content/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    res.write("event: ready\ndata: {}\n\n");
    contentClients.add(res);
    req.on("close", () => contentClients.delete(res));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/content") {
    const page = clean(url.searchParams.get("page"), 30);
    const content = readJson(files.content);
    sendJson(res, 200, {
      page,
      entries: {
        ...(content.shared || {}),
        ...(content[page] || {})
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/join") {
    const body = await readBody(req);
    const name = clean(body.name, 120);
    const email = clean(body.email, 180).toLowerCase();
    const interests = clean(body.interests, 500);
    const note = clean(body.note, 2000);

    if (!name || !validEmail(email)) {
      sendJson(res, 400, { error: "Please provide a name and valid email address." });
      return;
    }

    const records = readJson(files.joins);
    const record = createRecord({ name, email, interests, note });
    records.unshift(record);
    writeJson(files.joins, records);
    sendJson(res, 201, { message: "Registration received.", id: record.id });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/contact") {
    const body = await readBody(req);
    const name = clean(body.name, 120);
    const email = clean(body.email, 180).toLowerCase();
    const subject = clean(body.subject, 180);
    const message = clean(body.message, 5000);

    if (!name || !validEmail(email) || !message) {
      sendJson(res, 400, { error: "Please provide a name, valid email address, and message." });
      return;
    }

    const records = readJson(files.messages);
    const record = createRecord({ name, email, subject, message });
    records.unshift(record);
    writeJson(files.messages, records);
    sendJson(res, 201, { message: "Message received.", id: record.id });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readBody(req);
    if (clean(body.password, 200) !== ADMIN_PASSWORD) {
      sendJson(res, 401, { error: "Incorrect password." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { createdAt: Date.now() });
    sendJson(
      res,
      200,
      { authenticated: true },
      {
        "Set-Cookie": `kukuverse_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`
      }
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    const token = parseCookies(req).kukuverse_admin;
    if (token) {
      sessions.delete(token);
    }
    sendJson(
      res,
      200,
      { authenticated: false },
      { "Set-Cookie": "kukuverse_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" }
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/session") {
    sendJson(res, 200, {
      authenticated: isAdmin(req),
      emailConfigured: Boolean(RESEND_API_KEY && RESEND_FROM)
    });
    return;
  }

  if (url.pathname.startsWith("/api/admin/") && !requireAdmin(req, res)) {
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/joins") {
    sendJson(res, 200, { records: readJson(files.joins) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/messages") {
    sendJson(res, 200, { records: readJson(files.messages) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/content") {
    sendJson(res, 200, { pages: readJson(files.content) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/upload") {
    const body = await readBody(req, 12_000_000);
    const page = clean(body.page, 40);
    const key = clean(body.key, 80);
    const itemId = clean(body.itemId, 80);
    const fieldKey = clean(body.fieldKey, 80);
    const mimeType = clean(body.mimeType, 80);
    const extension = safeUploadExtension(mimeType);
    const encoded = clean(body.data, 11_000_000);
    const content = readJson(files.content);
    const entry = content[page]?.[key];

    const allowsDirectImageUpload = entry?.type === "image";
    const allowsCollectionImageUpload =
      entry?.type === "collection" &&
      fieldKey === "image";

    if (!allowsDirectImageUpload && !allowsCollectionImageUpload) {
      sendJson(res, 400, { error: "This content field does not accept image uploads." });
      return;
    }

    if (!extension || !encoded) {
      sendJson(res, 400, { error: "Please upload a JPG, PNG, WebP, GIF, or AVIF image." });
      return;
    }

    let imageBuffer;
    try {
      imageBuffer = Buffer.from(encoded, "base64");
    } catch {
      sendJson(res, 400, { error: "The uploaded image could not be decoded." });
      return;
    }

    if (!imageBuffer.length || imageBuffer.length > 8_000_000) {
      sendJson(res, 400, { error: "The image must be smaller than 8 MB." });
      return;
    }

    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, fileName), imageBuffer);
    const uploadedUrl = `/uploads/${fileName}`;

    sendJson(res, 201, {
      message: "Image uploaded and ready to publish.",
      url: uploadedUrl,
      page,
      key,
      itemId,
      fieldKey
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/notify") {
    if (!RESEND_API_KEY || !RESEND_FROM) {
      sendJson(res, 503, {
        error: "Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM, then restart the server."
      });
      return;
    }

    const body = await readBody(req);
    const subject = clean(body.subject, 180);
    const message = clean(body.message, 10000);
    if (!subject || !message) {
      sendJson(res, 400, { error: "Subject and message are required." });
      return;
    }

    const joins = readJson(files.joins);
    const recipients = [...new Set(
      joins
        .filter((record) => record.status !== "archived")
        .map((record) => record.email)
        .filter(validEmail)
    )];

    if (!recipients.length) {
      sendJson(res, 400, { error: "There are no active registered email addresses." });
      return;
    }

    const sentIds = [];
    for (const recipientGroup of chunks(recipients, 100)) {
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(recipientGroup.map((email) => ({
          from: RESEND_FROM,
          to: [email],
          subject,
          text: message
        })))
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        sendJson(res, 502, { error: payload.message || "The email provider rejected the campaign." });
        return;
      }

      sentIds.push(...(payload.data || []).map((item) => item.id));
    }

    const sentAt = new Date().toISOString();
    joins.forEach((record) => {
      if (recipients.includes(record.email)) {
        record.lastNotifiedAt = sentAt;
      }
    });
    writeJson(files.joins, joins);

    const campaigns = readJson(files.campaigns);
    campaigns.unshift(createRecord({
      subject,
      message,
      recipientCount: recipients.length,
      providerIds: sentIds
    }));
    writeJson(files.campaigns, campaigns);

    sendJson(res, 200, {
      message: `Notification sent to ${recipients.length} registered users.`,
      recipientCount: recipients.length
    });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/admin/content") {
    const body = await readBody(req);
    if (!body.pages || typeof body.pages !== "object") {
      sendJson(res, 400, { error: "Invalid content payload." });
      return;
    }

    const existing = readJson(files.content);
    for (const [page, entries] of Object.entries(body.pages)) {
      if (!existing[page] || typeof entries !== "object") {
        continue;
      }

      for (const [key, entry] of Object.entries(entries)) {
        if (!existing[page][key]) {
          continue;
        }
        const currentEntry = existing[page][key];

        if (currentEntry.type === "collection" && page === "story" && key === "createItems") {
          existing[page][key] = sanitizeStoryCreateItems(entry, currentEntry);
          continue;
        }

        if (currentEntry.type === "collection" && page === "index" && key === "heroGallery") {
          existing[page][key] = sanitizeIndexHeroGallery(entry, currentEntry);
          continue;
        }

        if (currentEntry.type === "collection" && page === "index" && key === "armoryItems") {
          existing[page][key] = sanitizeIndexArmoryItems(entry, currentEntry);
          continue;
        }

        if (typeof entry?.value !== "string") {
          continue;
        }

        const nextValue = entry.value.slice(0, 20000);
        if (currentEntry.type === "image" && currentEntry.value !== nextValue) {
          removeLocalUpload(currentEntry.value);
        }
        currentEntry.value = nextValue;
        if (currentEntry.type !== "image" && "style" in entry) {
          currentEntry.style = sanitizeContentStyle(entry.style);
        }
      }
    }

    writeJson(files.content, existing);
    broadcastContentUpdate(body.pages);
    sendJson(res, 200, { message: "Content saved.", pages: existing });
    return;
  }

  const statusMatch = url.pathname.match(/^\/api\/admin\/(joins|messages)\/([^/]+)$/);
  if (req.method === "PATCH" && statusMatch) {
    const [, collection, id] = statusMatch;
    const body = await readBody(req);
    const status = clean(body.status, 30);
    const allowed = new Set(["new", "reviewed", "contacted", "archived"]);

    if (!allowed.has(status)) {
      sendJson(res, 400, { error: "Invalid status." });
      return;
    }

    const file = files[collection];
    const records = readJson(file);
    const record = records.find((item) => item.id === id);
    if (!record) {
      sendJson(res, 404, { error: "Record not found." });
      return;
    }

    record.status = status;
    record.updatedAt = new Date().toISOString();
    writeJson(file, records);
    sendJson(res, 200, { record });
    return;
  }

  if (req.method === "DELETE" && statusMatch) {
    const [, collection, id] = statusMatch;
    const file = files[collection];
    const records = readJson(file);
    const nextRecords = records.filter((item) => item.id !== id);
    writeJson(file, nextRecords);
    sendJson(res, 200, { deleted: records.length !== nextRecords.length });
    return;
  }

  sendJson(res, 404, { error: "API endpoint not found." });
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") {
    pathname = "/story.html";
  }
  if (pathname === "/product.html") {
    res.writeHead(301, { Location: "/index.html" });
    res.end();
    return;
  }

  const isUpload = pathname.startsWith("/uploads/");
  const rootDirectory = isUpload ? UPLOADS_DIR : FRONTEND_DIR;
  const relativePath = isUpload ? pathname.slice("/uploads".length) : pathname;
  const requested = path.resolve(rootDirectory, `.${relativePath}`);
  const relativeToRoot = path.relative(rootDirectory, requested);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(requested, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(requested).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(requested).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${PORT}`}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error." });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`KUKUVERSE server running at http://127.0.0.1:${PORT}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log("Admin password: kukuverse-admin");
  }
});
