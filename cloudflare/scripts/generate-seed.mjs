import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const contentPath = path.join(projectRoot, "backend", "data", "content.json");
const joinsPath = path.join(projectRoot, "backend", "data", "joins.json");
const messagesPath = path.join(projectRoot, "backend", "data", "messages.json");
const campaignsPath = path.join(projectRoot, "backend", "data", "campaigns.json");
const outputPath = path.join(projectRoot, "cloudflare", "migrations", "0002_seed_content.sql");

const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const joins = JSON.parse(fs.readFileSync(joinsPath, "utf8"));
const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
const campaigns = JSON.parse(fs.readFileSync(campaignsPath, "utf8"));
const now = new Date().toISOString();

const escapeSql = (value) => String(value).replaceAll("'", "''");
const sqlValue = (value) => {
  if (value === null || value === undefined) {
    return "NULL";
  }
  return `'${escapeSql(value)}'`;
};

const statements = [
  "-- Generated from backend/data/*.json",
  "DELETE FROM site_content;",
  "DELETE FROM joins;",
  "DELETE FROM messages;",
  "DELETE FROM campaigns;",
  "DELETE FROM admin_sessions;"
];

for (const [page, data] of Object.entries(content)) {
  statements.push(
    `INSERT INTO site_content (page, data_json, updated_at) VALUES ('${escapeSql(page)}', '${escapeSql(JSON.stringify(data))}', '${now}');`
  );
}

for (const record of joins) {
  statements.push(
    `INSERT INTO joins (id, name, email, interests, note, status, created_at, updated_at, last_notified_at) VALUES (${sqlValue(record.id)}, ${sqlValue(record.name)}, ${sqlValue(record.email)}, ${sqlValue(record.interests || "")}, ${sqlValue(record.note || "")}, ${sqlValue(record.status || "new")}, ${sqlValue(record.createdAt || now)}, ${sqlValue(record.updatedAt || record.createdAt || now)}, ${sqlValue(record.lastNotifiedAt)});`
  );
}

for (const record of messages) {
  statements.push(
    `INSERT INTO messages (id, name, email, subject, message, status, created_at, updated_at) VALUES (${sqlValue(record.id)}, ${sqlValue(record.name)}, ${sqlValue(record.email)}, ${sqlValue(record.subject || "")}, ${sqlValue(record.message || "")}, ${sqlValue(record.status || "new")}, ${sqlValue(record.createdAt || now)}, ${sqlValue(record.updatedAt || record.createdAt || now)});`
  );
}

for (const record of campaigns) {
  statements.push(
    `INSERT INTO campaigns (id, subject, message, recipient_count, provider_ids_json, status, created_at) VALUES (${sqlValue(record.id)}, ${sqlValue(record.subject || "")}, ${sqlValue(record.message || "")}, ${Number(record.recipientCount || 0)}, ${sqlValue(JSON.stringify(record.providerIds || []))}, ${sqlValue(record.status || "new")}, ${sqlValue(record.createdAt || now)});`
  );
}

fs.writeFileSync(outputPath, `${statements.join("\n")}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
