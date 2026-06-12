const loginPanel = document.querySelector("[data-login-panel]");
const dashboard = document.querySelector("[data-dashboard]");
const loginForm = document.querySelector("[data-login-form]");
const loginMessage = document.querySelector("[data-login-message]");
const sectionTitle = document.querySelector("[data-section-title]");
const contentEditor = document.querySelector("[data-content-editor]");

let contentState = {};
let emailConfigured = false;
const dirtyPages = new Set();
const pageLabels = {
  shared: "Brand assets",
  story: "Story",
  index: "Products",
  lab: "The Lab"
};
const fontWeightOptions = ["default", "400", "500", "600", "700"];
const fontStyleOptions = ["default", "normal", "italic"];
const fontColorOptions = [
  { value: "default", label: "Default" },
  { value: "#000000", label: "Black" },
  { value: "#ffffff", label: "White" },
  { value: "custom", label: "Custom" }
];
const defaultTextStyles = {
  story: {
    heroKicker: { fontSize: "29px", fontWeight: "500", fontStyle: "normal" },
    heroTitle: { fontSize: "83px", fontWeight: "700", fontStyle: "normal" },
    heroDescription: { fontSize: "22px", fontWeight: "300", fontStyle: "normal" },
    beginningTitle: { fontSize: "56px", fontWeight: "600", fontStyle: "normal" },
    joinTitle: { fontSize: "64px", fontWeight: "600", fontStyle: "normal" },
    joinDescription: { fontSize: "18px", fontWeight: "300", fontStyle: "normal" },
    slide1Title: { fontSize: "22px", fontWeight: "600", fontStyle: "normal" },
    slide1Description: { fontSize: "16px", fontWeight: "300", fontStyle: "normal" },
    slide2Title: { fontSize: "22px", fontWeight: "600", fontStyle: "normal" },
    slide2Description: { fontSize: "16px", fontWeight: "300", fontStyle: "normal" },
    slide3Title: { fontSize: "22px", fontWeight: "600", fontStyle: "normal" },
    slide3Description: { fontSize: "16px", fontWeight: "300", fontStyle: "normal" }
  },
  index: {
    heroKicker: { fontSize: "12px", fontWeight: "600", fontStyle: "normal" },
    heroTitle: { fontSize: "83px", fontWeight: "700", fontStyle: "normal" },
    heroDescription: { fontSize: "18px", fontWeight: "300", fontStyle: "normal" },
    armoryKicker: { fontSize: "12px", fontWeight: "600", fontStyle: "normal" },
    armoryTitle: { fontSize: "64px", fontWeight: "700", fontStyle: "normal" },
    armoryActionLabel: { fontSize: "12px", fontWeight: "600", fontStyle: "normal" },
    ethosKicker: { fontSize: "12px", fontWeight: "600", fontStyle: "normal" },
    ethosTitle: { fontSize: "64px", fontWeight: "700", fontStyle: "normal" },
    ethosDescriptionOne: { fontSize: "18px", fontWeight: "300", fontStyle: "normal" },
    ethosDescriptionTwo: { fontSize: "18px", fontWeight: "300", fontStyle: "normal" },
    ethosMetricOneValue: { fontSize: "52px", fontWeight: "500", fontStyle: "normal" },
    ethosMetricOneLabel: { fontSize: "12px", fontWeight: "600", fontStyle: "normal" },
    ethosMetricTwoValue: { fontSize: "52px", fontWeight: "500", fontStyle: "normal" },
    ethosMetricTwoLabel: { fontSize: "12px", fontWeight: "600", fontStyle: "normal" }
  },
  lab: {
    heroTitle: { fontSize: "83px", fontWeight: "700", fontStyle: "normal" },
    heroDescription: { fontSize: "18px", fontWeight: "300", fontStyle: "normal" },
    teamTitle: { fontSize: "64px", fontWeight: "600", fontStyle: "normal" },
    teamDescription: { fontSize: "18px", fontWeight: "300", fontStyle: "normal" },
    officeTitle: { fontSize: "64px", fontWeight: "600", fontStyle: "normal" },
    officeDescription: { fontSize: "18px", fontWeight: "300", fontStyle: "normal" },
    makerTitle: { fontSize: "64px", fontWeight: "600", fontStyle: "normal" },
    makerDescription: { fontSize: "18px", fontWeight: "300", fontStyle: "normal" }
  }
};
const collectionSchemas = {
  story: {
    createItems: {
      label: "What We Create items",
      addButtonLabel: "Add column",
      emptyLabel: "No columns yet. Add one to show it on the Story page.",
      fields: [
        {
          key: "navLabel",
          label: "Navigation label",
          type: "text",
          styleKey: "navStyle",
          defaults: { fontSize: "15px", fontWeight: "600", fontStyle: "normal", color: "theme default" }
        },
        {
          key: "title",
          label: "Slide title",
          type: "text",
          styleKey: "titleStyle",
          defaults: { fontSize: "22px", fontWeight: "600", fontStyle: "normal", color: "theme default" }
        },
        {
          key: "description",
          label: "Slide description",
          type: "text",
          styleKey: "descriptionStyle",
          defaults: { fontSize: "16px", fontWeight: "300", fontStyle: "normal", color: "theme default" }
        },
        {
          key: "image",
          label: "Slide image",
          type: "image"
        }
      ]
    }
  },
  index: {
    heroGallery: {
      label: "Product hero gallery",
      addButtonLabel: "Add image",
      emptyLabel: "No hero images yet. Add one to show it on the Products page.",
      fields: [
        {
          key: "alt",
          label: "Image alt text",
          type: "text"
        },
        {
          key: "image",
          label: "Hero image",
          type: "image"
        }
      ]
    },
    armoryItems: {
      label: "Armory categories",
      addButtonLabel: "Add category",
      emptyLabel: "No categories yet. Add one to show it in the carousel.",
      fields: [
        {
          key: "title",
          label: "Category title",
          type: "text"
        },
        {
          key: "subtitle",
          label: "Category subtitle",
          type: "text"
        },
        {
          key: "alt",
          label: "Image alt text",
          type: "text"
        },
        {
          key: "image",
          label: "Category image",
          type: "image"
        }
      ]
    }
  }
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getDefaultStyleMeta(page, key) {
  return defaultTextStyles[page]?.[key] || {
    fontSize: "theme default",
    fontWeight: "theme default",
    fontStyle: "normal",
    color: "theme default"
  };
}

function getCollectionSchema(page, key) {
  return collectionSchemas[page]?.[key];
}

function normalizeColor(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : "";
}

function getColorSelection(value) {
  const normalized = normalizeColor(value);
  if (!normalized) {
    return "default";
  }

  if (normalized === "#000000" || normalized === "#ffffff") {
    return normalized;
  }

  return "custom";
}

function renderStyleControls({
  page,
  entryKey,
  defaults,
  style,
  styleContext = {},
  styleScope = "entry"
}) {
  const colorSelection = getColorSelection(style?.color);
  const customColorValue = normalizeColor(style?.color) || "#d9d9d9";

  return `
    <div class="editor-style-grid">
      <label class="editor-style-field">
        Font size
        <input
          type="number"
          min="10"
          max="120"
          step="1"
          placeholder="${escapeHtml(String(defaults.fontSize || "").replace("px", ""))}"
          value="${escapeHtml(String(style?.fontSize || "").replace("px", ""))}"
          data-style-page="${page}"
          data-style-key="${entryKey}"
          data-style-prop="fontSize"
          data-style-scope="${styleScope}"
          ${styleContext.itemId ? `data-style-item-id="${escapeHtml(styleContext.itemId)}"` : ""}
          ${styleContext.fieldKey ? `data-style-field-key="${escapeHtml(styleContext.fieldKey)}"` : ""}
        >
      </label>
      <label class="editor-style-field">
        Weight
        <select
          data-style-page="${page}"
          data-style-key="${entryKey}"
          data-style-prop="fontWeight"
          data-style-scope="${styleScope}"
          ${styleContext.itemId ? `data-style-item-id="${escapeHtml(styleContext.itemId)}"` : ""}
          ${styleContext.fieldKey ? `data-style-field-key="${escapeHtml(styleContext.fieldKey)}"` : ""}
        >
          ${fontWeightOptions.map((option) => `
            <option value="${option}" ${String(style?.fontWeight || "default") === option ? "selected" : ""}>
              ${option === "default" ? "Default" : option}
            </option>
          `).join("")}
        </select>
      </label>
      <label class="editor-style-field">
        Style
        <select
          data-style-page="${page}"
          data-style-key="${entryKey}"
          data-style-prop="fontStyle"
          data-style-scope="${styleScope}"
          ${styleContext.itemId ? `data-style-item-id="${escapeHtml(styleContext.itemId)}"` : ""}
          ${styleContext.fieldKey ? `data-style-field-key="${escapeHtml(styleContext.fieldKey)}"` : ""}
        >
          ${fontStyleOptions.map((option) => `
            <option value="${option}" ${String(style?.fontStyle || "default") === option ? "selected" : ""}>
              ${option === "default" ? "Default" : `${option[0].toUpperCase()}${option.slice(1)}`}
            </option>
          `).join("")}
        </select>
      </label>
      <label class="editor-style-field">
        Color
        <select
          data-style-page="${page}"
          data-style-key="${entryKey}"
          data-style-prop="color"
          data-style-scope="${styleScope}"
          ${styleContext.itemId ? `data-style-item-id="${escapeHtml(styleContext.itemId)}"` : ""}
          ${styleContext.fieldKey ? `data-style-field-key="${escapeHtml(styleContext.fieldKey)}"` : ""}
        >
          ${fontColorOptions.map((option) => `
            <option value="${option.value}" ${colorSelection === option.value ? "selected" : ""}>
              ${option.label}
            </option>
          `).join("")}
        </select>
      </label>
      <label
        class="editor-style-field ${colorSelection === "custom" ? "" : "is-hidden"}"
        data-color-custom-wrapper
      >
        Custom color
        <input
          type="color"
          value="${escapeHtml(customColorValue)}"
          data-style-page="${page}"
          data-style-key="${entryKey}"
          data-style-prop="colorCustom"
          data-style-scope="${styleScope}"
          ${styleContext.itemId ? `data-style-item-id="${escapeHtml(styleContext.itemId)}"` : ""}
          ${styleContext.fieldKey ? `data-style-field-key="${escapeHtml(styleContext.fieldKey)}"` : ""}
        >
      </label>
    </div>
    <div class="editor-style-hint">
      Default size: ${escapeHtml(defaults.fontSize)} | Default weight: ${escapeHtml(defaults.fontWeight)} | Default style: ${escapeHtml(defaults.fontStyle)} | Default color: ${escapeHtml(defaults.color || "theme default")}
    </div>
  `;
}

function renderImageField(page, key, entry) {
  return `
    <div class="image-upload-field">
      <div class="editor-label">${escapeHtml(entry.label)}</div>
      <div class="image-preview">
        <img src="${escapeHtml(entry.value)}" alt="${escapeHtml(entry.label)} preview">
      </div>
      <input type="hidden" data-content-page="${page}" data-content-key="${key}" value="${escapeHtml(entry.value)}">
      <label class="upload-button">
        Choose image
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" data-image-upload data-upload-page="${page}" data-upload-key="${key}">
      </label>
      <div class="upload-note">JPG, PNG, WebP, GIF or AVIF. Maximum 8 MB.</div>
      <div class="upload-status" data-upload-status></div>
    </div>
  `;
}

function renderCollectionImageField(page, entryKey, item, field) {
  return `
    <div class="image-upload-field">
      <div class="editor-label">${escapeHtml(field.label)}</div>
      <div class="image-preview">
        <img src="${escapeHtml(item[field.key] || "")}" alt="${escapeHtml(field.label)} preview">
      </div>
      <input
        type="hidden"
        value="${escapeHtml(item[field.key] || "")}"
        data-collection-page="${page}"
        data-collection-key="${entryKey}"
        data-collection-item-id="${item.id}"
        data-collection-field="${field.key}"
      >
      <label class="upload-button">
        Choose image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          data-image-upload
          data-upload-page="${page}"
          data-upload-key="${entryKey}"
          data-upload-item-id="${item.id}"
          data-upload-field-key="${field.key}"
        >
      </label>
      <div class="upload-note">JPG, PNG, WebP, GIF or AVIF. Maximum 8 MB.</div>
      <div class="upload-status" data-upload-status></div>
    </div>
  `;
}

function renderCollectionEditor(page, key, entry) {
  const schema = getCollectionSchema(page, key);
  if (!schema) {
    return "";
  }

  const items = Array.isArray(entry.items) ? entry.items : [];

  return `
    <div class="collection-editor" data-collection-editor data-collection-page="${page}" data-collection-key="${key}">
      <div class="collection-editor-header">
        <div>
          <div class="editor-label">${escapeHtml(entry.label || schema.label)}</div>
          <div class="collection-editor-copy">Add, remove, and reorder the visible Story page categories here.</div>
        </div>
        <button class="secondary-action" type="button" data-add-collection-item data-page="${page}" data-key="${key}">
          ${escapeHtml(schema.addButtonLabel)}
        </button>
      </div>
      <div class="collection-items">
        ${items.length ? items.map((item, index) => `
          <article class="collection-item-card" data-collection-item-card data-collection-item-id="${item.id}">
            <div class="collection-item-header">
              <strong>Column ${index + 1}</strong>
              <button
                class="delete-button"
                type="button"
                data-remove-collection-item
                data-page="${page}"
                data-key="${key}"
                data-item-id="${item.id}"
              >
                Remove
              </button>
            </div>
            <div class="collection-item-fields">
              ${schema.fields.map((field) => {
                if (field.type === "image") {
                  return `<div class="editor-field is-image">${renderCollectionImageField(page, key, item, field)}</div>`;
                }

                return `
                  <div class="editor-field">
                    <label>
                      ${escapeHtml(field.label)}
                      <textarea
                        rows="3"
                        data-collection-page="${page}"
                        data-collection-key="${key}"
                        data-collection-item-id="${item.id}"
                        data-collection-field="${field.key}"
                      >${escapeHtml(item[field.key] || "")}</textarea>
                    </label>
                    ${field.styleKey ? renderStyleControls({
                      page,
                      entryKey: key,
                      defaults: field.defaults,
                      style: item[field.styleKey],
                      styleContext: { itemId: item.id, fieldKey: field.key },
                      styleScope: "collection"
                    }) : ""}
                  </div>
                `;
              }).join("")}
            </div>
          </article>
        `).join("") : `<div class="empty-state compact-empty-state">${escapeHtml(schema.emptyLabel)}</div>`}
      </div>
    </div>
  `;
}

function syncAdminBrandLogo() {
  const logo = document.querySelector("[data-admin-brand-logo]");
  if (!logo) {
    return;
  }

  const value = contentState.shared?.headerLogo?.value || "";
  if (value) {
    logo.src = value;
  } else {
    logo.removeAttribute("src");
  }
}

function recordTable(records, type) {
  if (!records.length) {
    return '<div class="empty-state">No records yet.</div>';
  }

  const detailHeader = type === "joins" ? "Interests / note" : "Subject / message";
  const rows = records.map((record) => {
    const details = type === "joins"
      ? [record.interests, record.note].filter(Boolean).join(" / ")
      : [record.subject, record.message].filter(Boolean).join(" / ");

    return `
      <tr>
        <td>${escapeHtml(formatDate(record.createdAt))}</td>
        <td><strong>${escapeHtml(record.name)}</strong><br>${escapeHtml(record.email)}</td>
        <td>${escapeHtml(details || "-")}</td>
        <td>
          <select data-record-status data-type="${type}" data-id="${record.id}">
            ${["new", "reviewed", "contacted", "archived"].map((status) => (
              `<option value="${status}" ${record.status === status ? "selected" : ""}>${status}</option>`
            )).join("")}
          </select>
        </td>
        <td><button class="delete-button" type="button" data-delete-record data-type="${type}" data-id="${record.id}">Delete</button></td>
      </tr>
    `;
  }).join("");

  return `
    <table>
      <thead>
        <tr>
          <th>Received</th>
          <th>User</th>
          <th>${detailHeader}</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function loadRecords(type) {
  const payload = await api(`/api/admin/${type}`);
  const records = payload.records || [];
  const target = document.querySelector(`[data-${type}-table]`);
  target.innerHTML = recordTable(records, type);

  if (type === "joins") {
    document.querySelector("[data-join-count]").textContent = records.length;
    document.querySelector("[data-new-join-count]").textContent = records.filter((item) => item.status === "new").length;
  } else {
    document.querySelector("[data-message-count]").textContent = records.length;
    document.querySelector("[data-new-message-count]").textContent = records.filter((item) => item.status === "new").length;
  }
}

function renderContentEditor() {
  const pages = ["story", "index", "lab"].filter((page) => contentState[page]);
  const activePage = pages[0];
  const sharedEntries = contentState.shared || {};

  contentEditor.innerHTML = `
    ${Object.keys(sharedEntries).length ? `
      <section class="shared-content-panel">
        <div class="content-page-header">
          <div>
            <div class="admin-kicker">BRAND ASSETS</div>
            <h3>${escapeHtml(pageLabels.shared)}</h3>
            <p>Upload the shared logo once. After publishing, all page headers and the admin sidebar update together.</p>
          </div>
          <div class="publish-controls">
            <button class="publish-page-button" type="button" data-publish-page="shared">
              Confirm and publish
            </button>
            <div class="page-save-status" data-page-status="shared" aria-live="polite">No unpublished changes.</div>
          </div>
        </div>
        <div class="content-fields shared-content-fields">
          ${Object.entries(sharedEntries).map(([key, entry]) => `
            <div class="editor-field is-image">
              ${renderImageField("shared", key, entry)}
            </div>
          `).join("")}
        </div>
      </section>
    ` : ""}
    <div class="content-page-tabs" role="tablist" aria-label="Website pages">
      ${pages.map((page) => `
        <button
          class="content-page-tab ${page === activePage ? "is-active" : ""}"
          type="button"
          role="tab"
          aria-selected="${page === activePage}"
          data-content-tab="${page}"
        >
          ${escapeHtml(pageLabels[page])}
          <span class="dirty-dot" aria-hidden="true"></span>
        </button>
      `).join("")}
    </div>
    ${pages.map((page) => {
      const entries = contentState[page];
      return `
        <section
          class="content-page-panel ${page === activePage ? "is-active" : ""}"
          role="tabpanel"
          data-content-panel="${page}"
        >
          <div class="content-page-header">
            <div>
              <div class="admin-kicker">PAGE CONTENT</div>
              <h3>${escapeHtml(pageLabels[page])}</h3>
              <p>Changes remain a draft until you confirm publishing this page.</p>
            </div>
            <div class="publish-controls">
              <button class="publish-page-button" type="button" data-publish-page="${page}">
                Confirm and publish
              </button>
              <div class="page-save-status" data-page-status="${page}" aria-live="polite">No unpublished changes.</div>
            </div>
          </div>
          <div class="content-fields">
            ${Object.entries(entries).map(([key, entry]) => `
              <div class="editor-field ${entry.type === "image" ? "is-image" : ""}">
                ${entry.type === "collection"
                  ? renderCollectionEditor(page, key, entry)
                  : entry.type === "image"
                  ? renderImageField(page, key, entry)
                  : `
                      ${(() => {
                        const defaults = getDefaultStyleMeta(page, key);
                        return `
                    <label>
                      ${escapeHtml(entry.label)}
                      <textarea rows="3" data-content-page="${page}" data-content-key="${key}">${escapeHtml(entry.value)}</textarea>
                    </label>
                    ${renderStyleControls({ page, entryKey: key, defaults, style: entry.style })}
                        `;
                      })()}
                  `
                }
              </div>
            `).join("")}
          </div>
        </section>
      `;
    }).join("")}
  `;

  contentEditor.querySelectorAll("textarea").forEach(autoResizeTextarea);
  dirtyPages.forEach((page) => markPageDirty(page));
}

function collectPageEntries(page) {
  const entries = structuredClone(contentState[page]);

  contentEditor.querySelectorAll(`textarea[data-content-page="${page}"], input[type="hidden"][data-content-page="${page}"]`).forEach((field) => {
    entries[field.dataset.contentKey].value = field.value;
  });

  contentEditor.querySelectorAll(`[data-style-page="${page}"][data-style-scope="entry"]`).forEach((field) => {
    const key = field.dataset.styleKey;
    const prop = field.dataset.styleProp;
    const currentStyle = entries[key].style || {};
    let nextValue = String(field.value || "").trim();

    if (prop === "fontSize") {
      nextValue = nextValue ? `${nextValue}px` : "";
    }

    if (prop === "color") {
      nextValue = nextValue === "custom"
        ? normalizeColor(
          contentEditor.querySelector(
            `[data-style-page="${page}"][data-style-key="${key}"][data-style-prop="colorCustom"][data-style-scope="entry"]`
          )?.value
        )
        : normalizeColor(nextValue);
    }

    if (prop === "colorCustom") {
      return;
    }

    if (nextValue && nextValue !== "default") {
      currentStyle[prop] = nextValue;
    } else {
      delete currentStyle[prop];
    }

    entries[key].style = Object.keys(currentStyle).length ? currentStyle : undefined;
  });

  Object.entries(entries).forEach(([key, entry]) => {
    if (entry.type !== "collection") {
      return;
    }

    const schema = getCollectionSchema(page, key);
    if (!schema) {
      return;
    }

    const editorRoot = contentEditor.querySelector(
      `[data-collection-editor][data-collection-page="${page}"][data-collection-key="${key}"]`
    );
    const itemCards = Array.from(
      editorRoot?.querySelectorAll("[data-collection-item-card][data-collection-item-id]") || []
    );

    entry.items = itemCards.map((card) => {
      const itemId = card.dataset.collectionItemId;
      const item = { id: itemId };

      schema.fields.forEach((field) => {
        const fieldElement = card.querySelector(
          `[data-collection-page="${page}"][data-collection-key="${key}"][data-collection-item-id="${itemId}"][data-collection-field="${field.key}"]`
        );

        if (field.type === "image") {
          item[field.key] = fieldElement?.value || "";
          return;
        }

        item[field.key] = fieldElement?.value || "";

        if (field.styleKey) {
          const style = {};
          card.querySelectorAll(
            `[data-style-page="${page}"][data-style-key="${key}"][data-style-item-id="${itemId}"][data-style-field-key="${field.key}"]`
          ).forEach((styleField) => {
            const prop = styleField.dataset.styleProp;
            let nextValue = String(styleField.value || "").trim();

            if (prop === "fontSize") {
              nextValue = nextValue ? `${nextValue}px` : "";
            }

            if (prop === "color") {
              nextValue = nextValue === "custom"
                ? normalizeColor(
                  card.querySelector(
                    `[data-style-page="${page}"][data-style-key="${key}"][data-style-item-id="${itemId}"][data-style-field-key="${field.key}"][data-style-prop="colorCustom"]`
                  )?.value
                )
                : normalizeColor(nextValue);
            }

            if (prop === "colorCustom") {
              return;
            }

            if (nextValue && nextValue !== "default") {
              style[prop] = nextValue;
            }
          });

          item[field.styleKey] = Object.keys(style).length ? style : undefined;
        }
      });

      return item;
    });
  });

  return entries;
}

function syncDraftState() {
  ["shared", "story", "index", "lab"].forEach((page) => {
    if (!contentState[page]) {
      return;
    }

    contentState[page] = collectPageEntries(page);
  });
}

function autoResizeTextarea(field) {
  field.style.height = "auto";
  field.style.height = `${Math.max(field.scrollHeight, 96)}px`;
}

function setActiveContentPage(page) {
  contentEditor.querySelectorAll("[data-content-tab]").forEach((button) => {
    const active = button.dataset.contentTab === page;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  contentEditor.querySelectorAll("[data-content-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.contentPanel === page);
  });
}

function markPageDirty(page, message = "Unpublished changes.") {
  dirtyPages.add(page);
  contentEditor.querySelector(`[data-content-tab="${page}"]`)?.classList.add("is-dirty");
  contentEditor.querySelector(`[data-publish-page="${page}"]`)?.classList.add("is-dirty");
  const status = contentEditor.querySelector(`[data-page-status="${page}"]`);
  if (status) {
    status.textContent = message;
    status.classList.add("is-dirty");
    status.classList.remove("is-success", "is-error");
  }
}

function setPageStatus(page, message, state = "") {
  const status = contentEditor.querySelector(`[data-page-status="${page}"]`);
  if (!status) {
    return;
  }

  if (state === "success") {
    dirtyPages.delete(page);
  }

  status.textContent = message;
  status.classList.toggle("is-success", state === "success");
  status.classList.toggle("is-error", state === "error");
  status.classList.toggle("is-dirty", state === "dirty");
}

async function loadContent() {
  const payload = await api("/api/admin/content");
  contentState = payload.pages || {};
  dirtyPages.clear();
  renderContentEditor();
  syncAdminBrandLogo();
}

async function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  await Promise.all([loadRecords("joins"), loadRecords("messages"), loadContent()]);
}

function showLogin() {
  loginPanel.hidden = false;
  dashboard.hidden = true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  const form = new FormData(loginForm);

  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: form.get("password") })
    });
    loginForm.reset();
    await showDashboard();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

document.querySelectorAll("[data-admin-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.adminTab;
    document.querySelectorAll("[data-admin-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
    document.querySelectorAll("[data-admin-section]").forEach((section) => {
      section.classList.toggle("is-active", section.dataset.adminSection === tab);
    });
    sectionTitle.textContent = button.textContent;
  });
});

document.querySelectorAll("[data-refresh]").forEach((button) => {
  button.addEventListener("click", () => loadRecords(button.dataset.refresh));
});

document.addEventListener("change", async (event) => {
  const uploadInput = event.target.closest("[data-image-upload]");
  if (uploadInput) {
    const file = uploadInput.files?.[0];
    const field = uploadInput.closest(".image-upload-field");
    const status = field.querySelector("[data-upload-status]");
    const preview = field.querySelector(".image-preview img");
    const valueField = field.querySelector("[data-content-page]");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/") || file.size > 8_000_000) {
      status.textContent = "Please choose a supported image smaller than 8 MB.";
      uploadInput.value = "";
      return;
    }

    status.textContent = "Uploading...";
    uploadInput.disabled = true;

    try {
      const data = await fileToBase64(file);
      const payload = await api("/api/admin/upload", {
        method: "POST",
        body: JSON.stringify({
          page: uploadInput.dataset.uploadPage,
          key: uploadInput.dataset.uploadKey,
          itemId: uploadInput.dataset.uploadItemId,
          fieldKey: uploadInput.dataset.uploadFieldKey,
          mimeType: file.type,
          data
        })
      });

      const collectionValueField = field.querySelector("[data-collection-page]");
      (collectionValueField || valueField).value = payload.url;
      preview.src = `${payload.url}?v=${Date.now()}`;
      status.textContent = "Image uploaded. Confirm publishing to make it live.";
      markPageDirty(payload.page, "New image ready to publish.");
    } catch (error) {
      status.textContent = error.message;
    } finally {
      uploadInput.disabled = false;
      uploadInput.value = "";
    }
    return;
  }

  const select = event.target.closest("[data-record-status]");
  if (!select) {
    const colorSelect = event.target.closest('[data-style-prop="color"]');
    if (colorSelect) {
      colorSelect
        .closest(".editor-style-grid")
        ?.querySelector("[data-color-custom-wrapper]")
        ?.classList.toggle("is-hidden", colorSelect.value !== "custom");
    }
    return;
  }

  await api(`/api/admin/${select.dataset.type}/${select.dataset.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: select.value })
  });
  await loadRecords(select.dataset.type);
});

function handleEditorFieldChange(event) {
  const page = event.target.dataset.contentPage
    || event.target.dataset.stylePage
    || event.target.dataset.collectionPage;
  if (!page) {
    return;
  }

  const textarea = event.target.closest("textarea[data-content-page]");
  if (textarea) {
    autoResizeTextarea(textarea);
  }

  markPageDirty(page);
}

contentEditor.addEventListener("input", handleEditorFieldChange);
contentEditor.addEventListener("change", handleEditorFieldChange);

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.slice(value.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

document.addEventListener("click", async (event) => {
  const contentTab = event.target.closest("[data-content-tab]");
  if (contentTab) {
    setActiveContentPage(contentTab.dataset.contentTab);
    return;
  }

  const addCollectionItem = event.target.closest("[data-add-collection-item]");
  if (addCollectionItem) {
    syncDraftState();
    const page = addCollectionItem.dataset.page;
    const key = addCollectionItem.dataset.key;
    const entry = contentState[page]?.[key];
    const schema = getCollectionSchema(page, key);
    if (!entry || entry.type !== "collection") {
      return;
    }

    const nextItem = { id: `item-${Date.now()}-${Math.random().toString(16).slice(2, 8)}` };
    (schema?.fields || []).forEach((field, index) => {
      if (field.key === "navLabel") {
        nextItem[field.key] = "New column";
      } else if (field.key === "alt") {
        nextItem[field.key] = `Product image ${(entry.items || []).length + 1}`;
      } else {
        nextItem[field.key] = "";
      }
    });

    entry.items = [...(entry.items || []), nextItem];
    renderContentEditor();
    setActiveContentPage(page);
    markPageDirty(page);
    return;
  }

  const removeCollectionItem = event.target.closest("[data-remove-collection-item]");
  if (removeCollectionItem) {
    syncDraftState();
    const page = removeCollectionItem.dataset.page;
    const key = removeCollectionItem.dataset.key;
    const itemId = removeCollectionItem.dataset.itemId;
    const entry = contentState[page]?.[key];
    if (!entry || entry.type !== "collection") {
      return;
    }

    entry.items = (entry.items || []).filter((item) => item.id !== itemId);
    renderContentEditor();
    setActiveContentPage(page);
    markPageDirty(page);
    return;
  }

  const publishButton = event.target.closest("[data-publish-page]");
  if (publishButton) {
    const page = publishButton.dataset.publishPage;
    const pageLabel = pageLabels[page] || page;
    if (!window.confirm(`Publish all current changes to the ${pageLabel} page?`)) {
      return;
    }

    const entries = collectPageEntries(page);

    publishButton.disabled = true;
    setPageStatus(page, "Publishing...");
    try {
      const payload = await api("/api/admin/content", {
        method: "PUT",
        body: JSON.stringify({ pages: { [page]: entries } })
      });
      contentState[page] = payload.pages[page];
      dirtyPages.delete(page);
      syncAdminBrandLogo();
      contentEditor.querySelector(`[data-content-tab="${page}"]`)?.classList.remove("is-dirty");
      publishButton.classList.remove("is-dirty");
      setPageStatus(page, "Published successfully. Open website pages updated automatically.", "success");
    } catch (error) {
      setPageStatus(page, error.message, "error");
    } finally {
      publishButton.disabled = false;
    }
    return;
  }

  const button = event.target.closest("[data-delete-record]");
  if (!button || !window.confirm("Delete this record permanently?")) {
    return;
  }

  await api(`/api/admin/${button.dataset.type}/${button.dataset.id}`, { method: "DELETE" });
  await loadRecords(button.dataset.type);
});

document.querySelector("[data-logout]").addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST", body: "{}" });
  showLogin();
});

document.querySelector("[data-campaign-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("[data-campaign-message]");
  const button = form.querySelector('button[type="submit"]');

  if (!emailConfigured) {
    message.textContent = "Configure RESEND_API_KEY and RESEND_FROM before sending.";
    return;
  }

  if (!window.confirm("Send this notification to every active registered email address?")) {
    return;
  }

  message.textContent = "Sending...";
  button.disabled = true;

  try {
    const payload = await api("/api/admin/notify", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    form.reset();
    message.textContent = payload.message;
    await loadRecords("joins");
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

api("/api/admin/session")
  .then((session) => {
    emailConfigured = Boolean(session.emailConfigured);
    const badge = document.querySelector("[data-email-config]");
    badge.textContent = emailConfigured ? "Email service ready" : "Email service not configured";
    badge.classList.toggle("is-ready", emailConfigured);
    return session.authenticated ? showDashboard() : showLogin();
  })
  .catch(showLogin);
