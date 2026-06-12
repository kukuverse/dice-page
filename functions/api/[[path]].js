const MAX_JSON_BODY_BYTES = 1_000_000;
const MAX_UPLOAD_BODY_BYTES = 12_000_000;
const MAX_UPLOAD_IMAGE_BYTES = 8_000_000;
const SESSION_COOKIE = "kukuverse_admin";
const SESSION_TTL_SECONDS = 28_800;
const allowedStatus = new Set(["new", "reviewed", "contacted", "archived"]);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    if (request.method === "GET" && url.pathname === "/api/content/events") {
      return createSseReadyResponse();
    }

    if (request.method === "GET" && url.pathname === "/api/content") {
      const page = clean(url.searchParams.get("page"), 30);
      return json(200, {
        page,
        entries: await getMergedPageEntries(env, page)
      });
    }

    if (request.method === "POST" && url.pathname === "/api/join") {
      const body = await readJsonBody(request);
      const name = clean(body.name, 120);
      const email = clean(body.email, 180).toLowerCase();
      const interests = clean(body.interests, 500);
      const note = clean(body.note, 2000);

      if (!name || !validEmail(email)) {
        return json(400, { error: "Please provide a name and valid email address." });
      }

      const record = createRecord({ name, email, interests, note });
      await env.DB.prepare(`
        INSERT INTO joins (id, name, email, interests, note, status, created_at, updated_at, last_notified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        record.id,
        record.name,
        record.email,
        record.interests,
        record.note,
        record.status,
        record.createdAt,
        record.createdAt,
        null
      ).run();

      return json(201, { message: "Registration received.", id: record.id });
    }

    if (request.method === "POST" && url.pathname === "/api/contact") {
      const body = await readJsonBody(request);
      const name = clean(body.name, 120);
      const email = clean(body.email, 180).toLowerCase();
      const subject = clean(body.subject, 180);
      const message = clean(body.message, 5000);

      if (!name || !validEmail(email) || !message) {
        return json(400, { error: "Please provide a name, valid email address, and message." });
      }

      const record = createRecord({ name, email, subject, message });
      await env.DB.prepare(`
        INSERT INTO messages (id, name, email, subject, message, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        record.id,
        record.name,
        record.email,
        record.subject,
        record.message,
        record.status,
        record.createdAt,
        record.createdAt
      ).run();

      return json(201, { message: "Message received.", id: record.id });
    }

    if (request.method === "POST" && url.pathname === "/api/admin/login") {
      const body = await readJsonBody(request);
      const expectedPassword = String(env.ADMIN_PASSWORD || "");
      if (!expectedPassword || clean(body.password, 200) !== expectedPassword) {
        return json(401, { error: "Incorrect password." });
      }

      const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
      const now = Date.now();
      const expiresAt = new Date(now + SESSION_TTL_SECONDS * 1000).toISOString();
      await env.DB.prepare(`
        INSERT INTO admin_sessions (token, created_at, expires_at)
        VALUES (?, ?, ?)
      `).bind(token, new Date(now).toISOString(), expiresAt).run();

      return json(
        200,
        { authenticated: true },
        {
          "Set-Cookie": serializeSessionCookie(token, SESSION_TTL_SECONDS)
        }
      );
    }

    if (request.method === "POST" && url.pathname === "/api/admin/logout") {
      const token = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE);
      if (token) {
        await env.DB.prepare("DELETE FROM admin_sessions WHERE token = ?").bind(token).run();
      }

      return json(
        200,
        { authenticated: false },
        {
          "Set-Cookie": serializeSessionCookie("", 0)
        }
      );
    }

    if (request.method === "GET" && url.pathname === "/api/admin/session") {
      return json(200, {
        authenticated: await isAdmin(request, env),
        emailConfigured: Boolean(env.RESEND_API_KEY && env.RESEND_FROM)
      });
    }

    if (url.pathname.startsWith("/api/admin/")) {
      const authenticated = await isAdmin(request, env);
      if (!authenticated) {
        return json(401, { error: "Admin authentication required." });
      }
    }

    if (request.method === "GET" && url.pathname === "/api/admin/joins") {
      const { results } = await env.DB.prepare(`
        SELECT id, name, email, interests, note, status, created_at AS createdAt, updated_at AS updatedAt, last_notified_at AS lastNotifiedAt
        FROM joins
        ORDER BY datetime(created_at) DESC
      `).all();
      return json(200, { records: results || [] });
    }

    if (request.method === "GET" && url.pathname === "/api/admin/messages") {
      const { results } = await env.DB.prepare(`
        SELECT id, name, email, subject, message, status, created_at AS createdAt, updated_at AS updatedAt
        FROM messages
        ORDER BY datetime(created_at) DESC
      `).all();
      return json(200, { records: results || [] });
    }

    if (request.method === "GET" && url.pathname === "/api/admin/content") {
      return json(200, { pages: await getAllPages(env) });
    }

    if (request.method === "POST" && url.pathname === "/api/admin/upload") {
      const body = await readJsonBody(request, MAX_UPLOAD_BODY_BYTES);
      const page = clean(body.page, 40);
      const key = clean(body.key, 80);
      const itemId = clean(body.itemId, 80);
      const fieldKey = clean(body.fieldKey, 80);
      const mimeType = clean(body.mimeType, 80);
      const extension = safeUploadExtension(mimeType);
      const encoded = clean(body.data, 11_000_000);
      const content = await getAllPages(env);
      const entry = content[page]?.[key];

      const allowsDirectImageUpload = entry?.type === "image";
      const allowsCollectionImageUpload = entry?.type === "collection" && fieldKey === "image";
      if (!allowsDirectImageUpload && !allowsCollectionImageUpload) {
        return json(400, { error: "This content field does not accept image uploads." });
      }

      if (!extension || !encoded) {
        return json(400, { error: "Please upload a JPG, PNG, WebP, GIF, or AVIF image." });
      }

      let imageBytes;
      try {
        imageBytes = decodeBase64(encoded);
      } catch {
        return json(400, { error: "The uploaded image could not be decoded." });
      }

      if (!imageBytes.length || imageBytes.length > MAX_UPLOAD_IMAGE_BYTES) {
        return json(400, { error: "The image must be smaller than 8 MB." });
      }

      const objectKey = `${Date.now()}-${crypto.randomUUID().replaceAll("-", "")}${extension}`;
      await env.UPLOADS_BUCKET.put(objectKey, imageBytes, {
        httpMetadata: {
          contentType: mimeType
        }
      });

      return json(201, {
        message: "Image uploaded and ready to publish.",
        url: `/uploads/${objectKey}`,
        page,
        key,
        itemId,
        fieldKey
      });
    }

    if (request.method === "POST" && url.pathname === "/api/admin/notify") {
      if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
        return json(503, {
          error: "Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM, then redeploy."
        });
      }

      const body = await readJsonBody(request);
      const subject = clean(body.subject, 180);
      const message = clean(body.message, 10000);
      if (!subject || !message) {
        return json(400, { error: "Subject and message are required." });
      }

      const { results } = await env.DB.prepare(`
        SELECT email
        FROM joins
        WHERE status != 'archived'
        ORDER BY datetime(created_at) DESC
      `).all();
      const recipients = [...new Set((results || []).map((row) => row.email).filter(validEmail))];
      if (!recipients.length) {
        return json(400, { error: "There are no active registered email addresses." });
      }

      const sentIds = [];
      for (const recipientGroup of chunk(recipients, 100)) {
        const response = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(recipientGroup.map((email) => ({
            from: env.RESEND_FROM,
            to: [email],
            subject,
            text: message
          })))
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return json(502, { error: payload.message || "The email provider rejected the campaign." });
        }
        sentIds.push(...(payload.data || []).map((item) => item.id));
      }

      const sentAt = new Date().toISOString();
      await env.DB.prepare(`
        UPDATE joins
        SET last_notified_at = ?, updated_at = ?
        WHERE status != 'archived'
      `).bind(sentAt, sentAt).run();

      const campaign = createRecord({
        subject,
        message,
        recipientCount: recipients.length,
        providerIds: sentIds
      });
      await env.DB.prepare(`
        INSERT INTO campaigns (id, subject, message, recipient_count, provider_ids_json, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        campaign.id,
        campaign.subject,
        campaign.message,
        campaign.recipientCount,
        JSON.stringify(campaign.providerIds),
        campaign.status,
        campaign.createdAt
      ).run();

      return json(200, {
        message: `Notification sent to ${recipients.length} registered users.`,
        recipientCount: recipients.length
      });
    }

    if (request.method === "PUT" && url.pathname === "/api/admin/content") {
      const body = await readJsonBody(request);
      if (!body.pages || typeof body.pages !== "object") {
        return json(400, { error: "Invalid content payload." });
      }

      const existing = await getAllPages(env);
      await applyContentPatch(env, existing, body.pages);
      return json(200, { message: "Content saved.", pages: existing });
    }

    const statusMatch = url.pathname.match(/^\/api\/admin\/(joins|messages)\/([^/]+)$/);
    if (request.method === "PATCH" && statusMatch) {
      const [, collection, id] = statusMatch;
      const body = await readJsonBody(request);
      const status = clean(body.status, 30);

      if (!allowedStatus.has(status)) {
        return json(400, { error: "Invalid status." });
      }

      const column = collection === "joins" ? "joins" : "messages";
      const updatedAt = new Date().toISOString();
      const result = await env.DB.prepare(`
        UPDATE ${column}
        SET status = ?, updated_at = ?
        WHERE id = ?
      `).bind(status, updatedAt, id).run();

      if (!result.meta?.changes) {
        return json(404, { error: "Record not found." });
      }

      const record = await env.DB.prepare(`
        SELECT *
        FROM ${column}
        WHERE id = ?
      `).bind(id).first();

      return json(200, { record: normalizeRecord(record) });
    }

    if (request.method === "DELETE" && statusMatch) {
      const [, collection, id] = statusMatch;
      const result = await env.DB.prepare(`
        DELETE FROM ${collection === "joins" ? "joins" : "messages"}
        WHERE id = ?
      `).bind(id).run();
      return json(200, { deleted: Boolean(result.meta?.changes) });
    }

    return json(404, { error: "API endpoint not found." });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Internal server error." });
  }
}

function createSseReadyResponse() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform"
    }
  });
}

function normalizeRecord(record) {
  if (!record) {
    return null;
  }

  return {
    ...record,
    createdAt: record.created_at || record.createdAt,
    updatedAt: record.updated_at || record.updatedAt,
    lastNotifiedAt: record.last_notified_at || record.lastNotifiedAt
  };
}

async function applyContentPatch(env, existing, incomingPages) {
  for (const [page, entries] of Object.entries(incomingPages)) {
    if (!existing[page] || typeof entries !== "object") {
      continue;
    }

    for (const [key, entry] of Object.entries(entries)) {
      if (!existing[page][key]) {
        continue;
      }

      const currentEntry = existing[page][key];

      if (currentEntry.type === "collection" && page === "story" && key === "createItems") {
        existing[page][key] = await sanitizeStoryCreateItems(env, entry, currentEntry);
        continue;
      }

      if (currentEntry.type === "collection" && page === "index" && key === "heroGallery") {
        existing[page][key] = await sanitizeIndexHeroGallery(env, entry, currentEntry);
        continue;
      }

      if (currentEntry.type === "collection" && page === "index" && key === "armoryItems") {
        existing[page][key] = await sanitizeIndexArmoryItems(env, entry, currentEntry);
        continue;
      }

      if (typeof entry?.value !== "string") {
        continue;
      }

      const nextValue = entry.value.slice(0, 20000);
      if (currentEntry.type === "image" && currentEntry.value !== nextValue) {
        await deleteUploadIfManaged(env, currentEntry.value);
      }

      currentEntry.value = nextValue;
      if (currentEntry.type !== "image" && "style" in entry) {
        currentEntry.style = sanitizeContentStyle(entry.style);
      }
    }
  }

  await saveAllPages(env, existing);
}

async function getMergedPageEntries(env, page) {
  const pages = await getAllPages(env);
  return {
    ...(pages.shared || {}),
    ...(pages[page] || {})
  };
}

async function getAllPages(env) {
  const { results } = await env.DB.prepare(`
    SELECT page, data_json
    FROM site_content
  `).all();

  const pages = {};
  for (const row of results || []) {
    try {
      pages[row.page] = JSON.parse(row.data_json);
    } catch {
      pages[row.page] = {};
    }
  }
  return pages;
}

async function saveAllPages(env, pages) {
  const now = new Date().toISOString();
  for (const [page, data] of Object.entries(pages)) {
    await env.DB.prepare(`
      INSERT INTO site_content (page, data_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(page) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
    `).bind(page, JSON.stringify(data), now).run();
  }
}

async function sanitizeStoryCreateItems(env, entry, existingEntry) {
  const nextItems = Array.isArray(entry?.items) ? entry.items : [];
  const previousItems = Array.isArray(existingEntry?.items) ? existingEntry.items : [];
  const previousById = new Map(previousItems.map((item) => [item.id, item]));

  const items = [];
  for (let index = 0; index < nextItems.length; index += 1) {
    const item = nextItems[index];
    const previousItem = previousById.get(clean(item?.id, 80)) || {};
    const nextImage = clean(item?.image, 20000);
    if (previousItem.image && previousItem.image !== nextImage) {
      await deleteUploadIfManaged(env, previousItem.image);
    }

    items.push({
      id: clean(item?.id, 80) || crypto.randomUUID(),
      navLabel: clean(item?.navLabel, 120) || `Item ${index + 1}`,
      navStyle: sanitizeContentStyle(item?.navStyle),
      title: clean(item?.title, 200),
      titleStyle: sanitizeContentStyle(item?.titleStyle),
      description: clean(item?.description, 5000),
      descriptionStyle: sanitizeContentStyle(item?.descriptionStyle),
      image: nextImage
    });
  }

  for (const item of previousItems) {
    if (!items.some((nextItem) => nextItem.id === item.id)) {
      await deleteUploadIfManaged(env, item.image);
    }
  }

  return {
    ...existingEntry,
    items
  };
}

async function sanitizeIndexHeroGallery(env, entry, existingEntry) {
  const nextItems = Array.isArray(entry?.items) ? entry.items : [];
  const previousItems = Array.isArray(existingEntry?.items) ? existingEntry.items : [];
  const previousById = new Map(previousItems.map((item) => [item.id, item]));

  const items = [];
  for (let index = 0; index < nextItems.length; index += 1) {
    const item = nextItems[index];
    const previousItem = previousById.get(clean(item?.id, 80)) || {};
    const nextImage = clean(item?.image, 20000);
    if (previousItem.image && previousItem.image !== nextImage) {
      await deleteUploadIfManaged(env, previousItem.image);
    }

    items.push({
      id: clean(item?.id, 80) || crypto.randomUUID(),
      image: nextImage,
      alt: clean(item?.alt, 200) || `Vault X1 image ${index + 1}`
    });
  }

  for (const item of previousItems) {
    if (!items.some((nextItem) => nextItem.id === item.id)) {
      await deleteUploadIfManaged(env, item.image);
    }
  }

  return {
    ...existingEntry,
    items
  };
}

async function sanitizeIndexArmoryItems(env, entry, existingEntry) {
  const nextItems = Array.isArray(entry?.items) ? entry.items : [];
  const previousItems = Array.isArray(existingEntry?.items) ? existingEntry.items : [];
  const previousById = new Map(previousItems.map((item) => [item.id, item]));

  const items = [];
  for (let index = 0; index < nextItems.length; index += 1) {
    const item = nextItems[index];
    const previousItem = previousById.get(clean(item?.id, 80)) || {};
    const nextImage = clean(item?.image, 20000);
    if (previousItem.image && previousItem.image !== nextImage) {
      await deleteUploadIfManaged(env, previousItem.image);
    }

    items.push({
      id: clean(item?.id, 80) || crypto.randomUUID(),
      image: nextImage,
      title: clean(item?.title, 200) || `Category ${index + 1}`,
      subtitle: clean(item?.subtitle, 200),
      alt: clean(item?.alt, 200) || clean(item?.title, 200) || `Armory item ${index + 1}`
    });
  }

  for (const item of previousItems) {
    if (!items.some((nextItem) => nextItem.id === item.id)) {
      await deleteUploadIfManaged(env, item.image);
    }
  }

  return {
    ...existingEntry,
    items
  };
}

async function deleteUploadIfManaged(env, value) {
  const key = getManagedUploadKey(value);
  if (!key) {
    return;
  }

  await env.UPLOADS_BUCKET.delete(key);
}

function getManagedUploadKey(value) {
  const normalized = String(value || "").trim();
  if (!normalized.startsWith("/uploads/")) {
    return "";
  }
  return normalized.slice("/uploads/".length);
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

async function isAdmin(request, env) {
  const token = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE);
  if (!token) {
    return false;
  }

  const row = await env.DB.prepare(`
    SELECT token
    FROM admin_sessions
    WHERE token = ?
      AND datetime(expires_at) > datetime('now')
  `).bind(token).first();

  if (row) {
    return true;
  }

  await env.DB.prepare("DELETE FROM admin_sessions WHERE datetime(expires_at) <= datetime('now')").run();
  return false;
}

function parseCookies(cookieHeader) {
  const cookies = new Map();
  for (const part of String(cookieHeader || "").split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }

    cookies.set(trimmed.slice(0, index), decodeURIComponent(trimmed.slice(index + 1)));
  }
  return cookies;
}

function serializeSessionCookie(value, maxAge) {
  const attributes = "HttpOnly; SameSite=Strict; Path=/";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; ${attributes}; Max-Age=${maxAge}`;
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

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function createRecord(data) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "new",
    ...data
  };
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clean(value, maxLength = 5000) {
  return String(value || "").trim().slice(0, maxLength);
}

async function readJsonBody(request, maxBytes = MAX_JSON_BODY_BYTES) {
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new Error("Request body is too large.");
  }
  if (!text) {
    return {};
  }
  return JSON.parse(text);
}

function decodeBase64(encoded) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function json(status, value, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}
