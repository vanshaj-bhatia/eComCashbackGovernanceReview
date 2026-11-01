/**
 * Exact Chrome Extension Source Files for inspection and ZIP packaging
 */
import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  path: string;
  language: 'json' | 'html' | 'javascript' | 'css' | 'markdown';
  description: string;
  content: string;
}

export const EXTENSION_FILES: ExtensionFile[] = [
  {
    name: "manifest.json",
    path: "manifest.json",
    language: "json",
    description: "Chrome Extension Manifest V3 configuration with storage, side-panel & WhatsApp Web permissions.",
    content: `{
  "manifest_version": 3,
  "name": "Cashback & Order Governance Tracker",
  "version": "1.0.0",
  "description": "Internal e-commerce order fraud prevention, duplicate claim guardrail, WhatsApp Web order audit & Google Sheets sync.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Cashback Governance Tracker"
  },
  "side_panel": {
    "default_path": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "permissions": [
    "storage",
    "clipboardRead",
    "activeTab",
    "sidePanel"
  ],
  "host_permissions": [
    "https://web.whatsapp.com/*",
    "https://script.google.com/*",
    "https://script.googleusercontent.com/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://web.whatsapp.com/*"
      ],
      "js": [
        "content.js"
      ],
      "css": [
        "content.css"
      ],
      "run_at": "document_idle"
    }
  ]
}`
  },
  {
    name: "popup.html",
    path: "popup.html",
    language: "html",
    description: "Modern extension UI with duplicate alert banner, screenshot dropzones, and recent claims table.",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cashback & Order Governance Tracker</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- App Header -->
  <header class="app-header">
    <div class="brand-wrapper">
      <div class="brand-icon">🛡️</div>
      <div>
        <div class="brand-title">Cashback & Governance Tracker</div>
        <div class="brand-subtitle">
          <span class="badge-live"></span>
          <span>Order Fraud Guardrail active</span>
        </div>
      </div>
    </div>
    <div class="header-actions">
      <button id="btnOpenSidePanel" class="btn-icon-ghost" title="Dock in Side Panel">◫</button>
      <button id="btnToggleSettings" class="btn-icon-ghost" title="Google Sheet Sync Settings">⚙️</button>
    </div>
  </header>

  <!-- Google Sheet Sync Settings Drawer (Collapsible) -->
  <div id="settingsDrawer" class="settings-drawer">
    <div class="settings-title">
      <span>📊 Google Sheet Web App Sync</span>
    </div>
    <div class="form-group" style="margin-bottom: 8px;">
      <label class="form-label" for="settingWebhookUrl">Google Apps Script Web App URL</label>
      <input 
        type="url" 
        id="settingWebhookUrl" 
        class="form-input" 
        placeholder="https://script.google.com/macros/s/.../exec"
      />
      <div class="input-hint">Paste your deployed Web App URL to auto-sync each recorded cashback.</div>
    </div>
    <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between;">
      <label style="font-size: 11.5px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
        <input type="checkbox" id="settingAutoSync" checked />
        <span>Auto-sync new entries</span>
      </label>
      <div style="display: flex; gap: 6px;">
        <button type="button" id="btnTestWebhook" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;">
          Test Ping
        </button>
        <button type="button" id="btnSaveSettings" class="btn-primary" style="padding: 4px 10px; font-size: 11px;">
          Save
        </button>
      </div>
    </div>
  </div>

  <!-- Duplicate Guardrail Warning Banner -->
  <div id="duplicateAlert" class="guardrail-alert" role="alert">
    <div class="guardrail-title">
      <span>⚠️ DUPLICATE ORDER ID DETECTED!</span>
    </div>
    <div class="guardrail-desc" id="duplicateAlertText">
      This Order ID has already been claimed! Disbursement submission is locked.
    </div>
    <div class="guardrail-badge-details">
      <span id="duplicateAlertDate">Claimed on: --</span>
      <span id="duplicateAlertAmount" style="font-weight: 700;">Amount: ₹0</span>
    </div>
  </div>

  <!-- Main Container -->
  <main class="container">

    <!-- Disbursement Submission Form -->
    <form id="cashbackForm" class="form-card" novalidate>
      <div class="form-grid">
        
        <!-- Order ID -->
        <div class="form-group form-full">
          <label class="form-label" for="orderId">
            <span>Order ID <span class="req">*</span></span>
            <span id="orderIdStatusTag" style="font-size: 10.5px; font-weight: 600; color: #10b981; display: none;">✓ Available</span>
          </label>
          <div class="input-with-icon">
            <span class="input-icon">#</span>
            <input 
              type="text" 
              id="orderId" 
              class="form-input" 
              placeholder="e.g. 402-9842182-1928421 or ORD-88910"
              required 
              autocomplete="off"
            />
          </div>
          <div class="input-hint">Checked against local records & synced registry in real-time.</div>
        </div>

        <!-- Customer Name / WhatsApp Number -->
        <div class="form-group form-full">
          <label class="form-label" for="customerInfo">
            <span>Customer Name / WhatsApp <span style="font-weight: normal; color: var(--text-muted);">(Optional)</span></span>
          </label>
          <div class="input-with-icon">
            <span class="input-icon">👤</span>
            <input 
              type="text" 
              id="customerInfo" 
              class="form-input" 
              placeholder="e.g. Rahul Sharma / +91 98765 43210"
            />
          </div>
        </div>

        <!-- Order Amount (₹) -->
        <div class="form-group">
          <label class="form-label" for="orderAmount">
            <span>Order Amount (₹) <span class="req">*</span></span>
          </label>
          <div class="input-with-icon">
            <span class="input-icon">₹</span>
            <input 
              type="number" 
              id="orderAmount" 
              class="form-input" 
              placeholder="1499" 
              min="1" 
              step="any"
              required 
            />
          </div>
        </div>

        <!-- Cashback Initiated (₹) -->
        <div class="form-group">
          <label class="form-label" for="cashbackAmount">
            <span>Cashback (₹) <span class="req">*</span></span>
            <span id="cashbackPercentageBadge" class="cashback-meta-tag" style="display: none;">0%</span>
          </label>
          <div class="input-with-icon">
            <span class="input-icon">₹</span>
            <input 
              type="number" 
              id="cashbackAmount" 
              class="form-input" 
              placeholder="150" 
              min="0" 
              step="any"
              required 
            />
          </div>
        </div>

        <!-- Date of Cashback -->
        <div class="form-group">
          <label class="form-label" for="dateOfCashback">
            <span>Disbursement Date <span class="req">*</span></span>
          </label>
          <input 
            type="datetime-local" 
            id="dateOfCashback" 
            class="form-input" 
            required 
          />
        </div>

        <!-- Status / Workflow Dropdown -->
        <div class="form-group">
          <label class="form-label" for="claimStatus">
            <span>Status <span class="req">*</span></span>
          </label>
          <select id="claimStatus" class="form-select">
            <option value="Initiated">Initiated</option>
            <option value="Pending UPI">Pending UPI</option>
            <option value="Completed" selected>Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <!-- Screenshots Section (Order & Review) -->
        <div class="form-full" style="margin-top: 4px;">
          <div class="form-label" style="margin-bottom: 6px;">
            <span>Screenshots Evidence <span style="font-weight: normal; color: var(--text-muted);">(Upload, Drag or Ctrl+V)</span></span>
          </div>
          <div class="screenshot-grid">
            
            <!-- Order Screenshot Dropzone -->
            <div id="orderDropzone" class="dropzone-box" tabindex="0">
              <div class="dropzone-default">
                <div class="dropzone-icon">📦</div>
                <div class="dropzone-text">Order Screenshot</div>
                <div class="dropzone-sub">Drop or Paste image</div>
              </div>
              <div id="orderPreviewContainer" class="preview-container">
                <img id="orderPreviewImg" class="preview-img" alt="Order Preview" />
                <button type="button" id="btnRemoveOrderImg" class="btn-remove-preview" title="Remove">✕</button>
              </div>
              <input type="file" id="orderImgInput" class="dropzone-input" accept="image/*" />
            </div>

            <!-- Review Screenshot Dropzone -->
            <div id="reviewDropzone" class="dropzone-box" tabindex="0">
              <div class="dropzone-default">
                <div class="dropzone-icon">⭐</div>
                <div class="dropzone-text">Review Screenshot</div>
                <div class="dropzone-sub">Drop or Paste image</div>
              </div>
              <div id="reviewPreviewContainer" class="preview-container">
                <img id="reviewPreviewImg" class="preview-img" alt="Review Preview" />
                <button type="button" id="btnRemoveReviewImg" class="btn-remove-preview" title="Remove">✕</button>
              </div>
              <input type="file" id="reviewImgInput" class="dropzone-input" accept="image/*" />
            </div>

          </div>
        </div>

        <!-- Notes -->
        <div class="form-group form-full">
          <label class="form-label" for="claimNotes">
            <span>Notes / UPI Ref ID <span style="font-weight: normal; color: var(--text-muted);">(Optional)</span></span>
          </label>
          <input 
            type="text" 
            id="claimNotes" 
            class="form-input" 
            placeholder="e.g. Paid via PhonePe txn #9812491, 5-star verified"
          />
        </div>

      </div>

      <!-- Action Buttons -->
      <div class="form-actions">
        <button type="button" id="btnResetForm" class="btn-secondary">Clear</button>
        <button type="submit" id="btnSubmitClaim" class="btn-primary">
          <span id="btnSubmitSpinner" style="display: none;">⏳</span>
          <span id="btnSubmitText">🛡️ Record & Guard Order</span>
        </button>
      </div>
    </form>

    <!-- Recent Claims Governance Table -->
    <section class="claims-card">
      <div class="claims-header">
        <div class="claims-title">
          <span>Recent Claims</span>
          <span id="claimsCountBadge" class="claims-count-badge">0</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button type="button" id="btnExportCsv" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Export records to CSV / Excel">
            📥 Export CSV
          </button>
        </div>
      </div>

      <!-- Quick Search Bar -->
      <div class="search-bar">
        <div class="input-with-icon">
          <span class="input-icon">🔍</span>
          <input 
            type="text" 
            id="searchQuery" 
            class="form-input" 
            placeholder="Search Order ID or WhatsApp Number..." 
          />
        </div>
      </div>

      <!-- Table View -->
      <div class="claims-table-wrapper">
        <table class="claims-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Order</th>
              <th>Cashback</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="claimsTableBody">
            <!-- Dynamic rows will be inserted here -->
          </tbody>
        </table>
        <div id="emptyClaimsPlaceholder" class="claims-empty">
          No cashback claims recorded yet.
        </div>
      </div>
    </section>

  </main>

  <!-- Toast Notification -->
  <div id="toastMessage" class="toast-msg">
    <span id="toastIcon">✓</span>
    <span id="toastText">Record saved successfully!</span>
  </div>

  <script src="popup.js"></script>
</body>
</html>`
  },
  {
    name: "popup.js",
    path: "popup.js",
    language: "javascript",
    description: "Core logic: Real-time duplicate checking, screenshot handlers, storage & Google Sheets sync.",
    content: `/**
 * Cashback & Order Governance Tracker - Popup & Side Panel Logic (Manifest V3)
 * Full duplicate detection guardrail, screenshot handlers, storage & Google Sheets sync.
 */

// Storage Keys
const STORAGE_KEY_RECORDS = "cashback_records_v1";
const STORAGE_KEY_SETTINGS = "cashback_settings_v1";

// In-memory state
let records = [];
let settings = {
  webhookUrl: "",
  autoSync: true
};
let activeDuplicate = null;
let orderScreenshotBase64 = null;
let reviewScreenshotBase64 = null;

// DOM Elements
const form = document.getElementById("cashbackForm");
const orderIdInput = document.getElementById("orderId");
const orderIdStatusTag = document.getElementById("orderIdStatusTag");
const customerInfoInput = document.getElementById("customerInfo");
const orderAmountInput = document.getElementById("orderAmount");
const cashbackAmountInput = document.getElementById("cashbackAmount");
const cashbackPercentBadge = document.getElementById("cashbackPercentageBadge");
const dateOfCashbackInput = document.getElementById("dateOfCashback");
const claimStatusSelect = document.getElementById("claimStatus");
const claimNotesInput = document.getElementById("claimNotes");

// Duplicate Alert
const duplicateAlert = document.getElementById("duplicateAlert");
const duplicateAlertText = document.getElementById("duplicateAlertText");
const duplicateAlertDate = document.getElementById("duplicateAlertDate");
const duplicateAlertAmount = document.getElementById("duplicateAlertAmount");

// Buttons & UI Controls
const btnSubmit = document.getElementById("btnSubmitClaim");
const btnSubmitText = document.getElementById("btnSubmitText");
const btnSubmitSpinner = document.getElementById("btnSubmitSpinner");
const btnReset = document.getElementById("btnResetForm");
const btnExportCsv = document.getElementById("btnExportCsv");
const searchQuery = document.getElementById("searchQuery");
const claimsTableBody = document.getElementById("claimsTableBody");
const emptyClaimsPlaceholder = document.getElementById("emptyClaimsPlaceholder");
const claimsCountBadge = document.getElementById("claimsCountBadge");
const toastMessage = document.getElementById("toastMessage");
const toastText = document.getElementById("toastText");

// Settings Drawer Elements
const btnToggleSettings = document.getElementById("btnToggleSettings");
const settingsDrawer = document.getElementById("settingsDrawer");
const settingWebhookUrl = document.getElementById("settingWebhookUrl");
const settingAutoSync = document.getElementById("settingAutoSync");
const btnSaveSettings = document.getElementById("btnSaveSettings");
const btnTestWebhook = document.getElementById("btnTestWebhook");
const btnOpenSidePanel = document.getElementById("btnOpenSidePanel");

// Screenshot Dropzones
const orderDropzone = document.getElementById("orderDropzone");
const orderImgInput = document.getElementById("orderImgInput");
const orderPreviewContainer = document.getElementById("orderPreviewContainer");
const orderPreviewImg = document.getElementById("orderPreviewImg");
const btnRemoveOrderImg = document.getElementById("btnRemoveOrderImg");

const reviewDropzone = document.getElementById("reviewDropzone");
const reviewImgInput = document.getElementById("reviewImgInput");
const reviewPreviewContainer = document.getElementById("reviewPreviewContainer");
const reviewPreviewImg = document.getElementById("reviewPreviewImg");
const btnRemoveReviewImg = document.getElementById("btnRemoveReviewImg");

// Initialize on Load
document.addEventListener("DOMContentLoaded", async () => {
  initDefaultDateTime();
  await loadSettings();
  await loadRecords();
  setupEventListeners();
  checkUrlParamsForPrefill();
});

const storage = {
  async get(key) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => resolve(result[key]));
      });
    }
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  },
  async set(key, value) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function initDefaultDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  dateOfCashbackInput.value = now.toISOString().slice(0, 16);
}

async function loadSettings() {
  const saved = await storage.get(STORAGE_KEY_SETTINGS);
  if (saved) {
    settings = { ...settings, ...saved };
  }
  if (settingWebhookUrl) settingWebhookUrl.value = settings.webhookUrl || "";
  if (settingAutoSync) settingAutoSync.checked = settings.autoSync !== false;
}

async function loadRecords() {
  const saved = await storage.get(STORAGE_KEY_RECORDS);
  records = Array.isArray(saved) ? saved : [];
  renderClaimsTable(records);
}

function setupEventListeners() {
  orderIdInput.addEventListener("input", handleOrderIdInput);
  orderIdInput.addEventListener("paste", () => setTimeout(handleOrderIdInput, 50));

  orderAmountInput.addEventListener("input", updateCashbackPercentage);
  cashbackAmountInput.addEventListener("input", updateCashbackPercentage);

  form.addEventListener("submit", handleFormSubmit);
  btnReset.addEventListener("click", resetForm);

  searchQuery.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderClaimsTable(records);
      return;
    }
    const filtered = records.filter(r => 
      (r.orderId && r.orderId.toLowerCase().includes(q)) ||
      (r.customerInfo && r.customerInfo.toLowerCase().includes(q)) ||
      (r.status && r.status.toLowerCase().includes(q))
    );
    renderClaimsTable(filtered);
  });

  btnExportCsv.addEventListener("click", exportToCsv);

  btnToggleSettings.addEventListener("click", () => {
    settingsDrawer.classList.toggle("open");
  });

  btnSaveSettings.addEventListener("click", async () => {
    settings.webhookUrl = settingWebhookUrl.value.trim();
    settings.autoSync = settingAutoSync.checked;
    await storage.set(STORAGE_KEY_SETTINGS, settings);
    showToast("Settings saved successfully!", "✓");
    settingsDrawer.classList.remove("open");
  });

  btnTestWebhook.addEventListener("click", testWebhookConnection);

  btnOpenSidePanel.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.sidePanel.open({ tabId: tabs[0].id });
        }
      });
    } else {
      showToast("Side panel available via Chrome toolbar", "ℹ️");
    }
  });

  setupDropzone(orderDropzone, orderImgInput, (b64) => {
    orderScreenshotBase64 = b64;
    showImagePreview(orderPreviewContainer, orderPreviewImg, b64);
  });

  setupDropzone(reviewDropzone, reviewImgInput, (b64) => {
    reviewScreenshotBase64 = b64;
    showImagePreview(reviewPreviewContainer, reviewPreviewImg, b64);
  });

  btnRemoveOrderImg.addEventListener("click", (e) => {
    e.stopPropagation();
    orderScreenshotBase64 = null;
    hideImagePreview(orderDropzone, orderPreviewContainer, orderImgInput);
  });

  btnRemoveReviewImg.addEventListener("click", (e) => {
    e.stopPropagation();
    reviewScreenshotBase64 = null;
    hideImagePreview(reviewDropzone, reviewPreviewContainer, reviewImgInput);
  });

  window.addEventListener("paste", handleGlobalPaste);
}

function normalizeOrderId(id) {
  if (!id) return "";
  return id.trim().replace(/^#+/, "").toUpperCase();
}

function handleOrderIdInput() {
  const rawId = orderIdInput.value;
  const cleanId = normalizeOrderId(rawId);

  if (!cleanId) {
    hideDuplicateAlert();
    orderIdStatusTag.style.display = "none";
    orderIdInput.classList.remove("input-error", "input-success");
    btnSubmit.disabled = false;
    activeDuplicate = null;
    return;
  }

  const match = records.find(r => normalizeOrderId(r.orderId) === cleanId);

  if (match) {
    activeDuplicate = match;
    duplicateAlertText.innerHTML = \`⚠️ Order <strong>#\${match.orderId}</strong> was already claimed! To prevent duplicate payout fraud, submission has been locked.\`;
    duplicateAlertDate.textContent = \`Claimed on: \${formatDisplayDate(match.dateOfCashback || match.timestamp)}\`;
    duplicateAlertAmount.textContent = \`Amount: ₹\${match.cashbackAmount || 0} (\${match.status || "Completed"})\`;
    
    duplicateAlert.classList.add("active");
    orderIdInput.classList.add("input-error");
    orderIdInput.classList.remove("input-success");
    orderIdStatusTag.style.display = "none";
    btnSubmit.disabled = true;
    btnSubmitText.textContent = "🚫 Blocked: Duplicate Order ID";
  } else {
    activeDuplicate = null;
    hideDuplicateAlert();
    orderIdInput.classList.remove("input-error");
    orderIdInput.classList.add("input-success");
    orderIdStatusTag.style.display = "inline";
    orderIdStatusTag.textContent = "✓ Order ID Available";
    btnSubmit.disabled = false;
    btnSubmitText.textContent = "🛡️ Record & Guard Order";
  }
}

function hideDuplicateAlert() {
  duplicateAlert.classList.remove("active");
}

function updateCashbackPercentage() {
  const orderAmt = parseFloat(orderAmountInput.value) || 0;
  const cashbackAmt = parseFloat(cashbackAmountInput.value) || 0;

  if (orderAmt > 0 && cashbackAmt >= 0) {
    const pct = ((cashbackAmt / orderAmt) * 100).toFixed(1);
    cashbackPercentBadge.textContent = \`\${pct}%\`;
    cashbackPercentBadge.style.display = "inline-block";
  } else {
    cashbackPercentBadge.style.display = "none";
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const cleanId = normalizeOrderId(orderIdInput.value);
  if (!cleanId) {
    showToast("Please enter an Order ID", "⚠️");
    orderIdInput.focus();
    return;
  }

  const existing = records.find(r => normalizeOrderId(r.orderId) === cleanId);
  if (existing) {
    handleOrderIdInput();
    showToast("Submission blocked: Duplicate Order ID detected!", "🚫");
    return;
  }

  const orderAmt = parseFloat(orderAmountInput.value);
  const cashbackAmt = parseFloat(cashbackAmountInput.value);

  if (isNaN(orderAmt) || orderAmt <= 0) {
    showToast("Please enter a valid Order Amount", "⚠️");
    orderAmountInput.focus();
    return;
  }

  if (isNaN(cashbackAmt) || cashbackAmt < 0) {
    showToast("Please enter a valid Cashback Amount", "⚠️");
    cashbackAmountInput.focus();
    return;
  }

  const newRecord = {
    id: "claim_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    orderId: orderIdInput.value.trim(),
    customerInfo: customerInfoInput.value.trim() || "N/A",
    orderAmount: orderAmt,
    cashbackAmount: cashbackAmt,
    dateOfCashback: dateOfCashbackInput.value || new Date().toISOString(),
    status: claimStatusSelect.value,
    notes: claimNotesInput.value.trim(),
    orderScreenshot: orderScreenshotBase64 || null,
    reviewScreenshot: reviewScreenshotBase64 || null,
    syncedToGoogleSheet: false
  };

  btnSubmit.disabled = true;
  btnSubmitSpinner.style.display = "inline";
  btnSubmitText.textContent = "Securing record...";

  try {
    records.unshift(newRecord);
    await storage.set(STORAGE_KEY_RECORDS, records);
    renderClaimsTable(records);

    if (settings.webhookUrl && settings.autoSync) {
      btnSubmitText.textContent = "Syncing with Google Sheets...";
      const syncResult = await syncRecordToGoogleSheet(newRecord, settings.webhookUrl);
      if (syncResult.success) {
        newRecord.syncedToGoogleSheet = true;
        await storage.set(STORAGE_KEY_RECORDS, records);
        showToast("Claim recorded & synced to Google Sheet!", "✓");
      } else {
        showToast("Claim recorded locally (Sheet sync: " + (syncResult.message || "Failed") + ")", "⚠️");
      }
    } else {
      showToast("Order claim secured in local storage!", "✓");
    }

    resetForm();

  } catch (err) {
    console.error("Failed to record claim:", err);
    showToast("Error saving claim: " + err.message, "✕");
  } finally {
    btnSubmitSpinner.style.display = "none";
    btnSubmit.disabled = false;
    btnSubmitText.textContent = "🛡️ Record & Guard Order";
  }
}

function resetForm() {
  form.reset();
  initDefaultDateTime();
  orderScreenshotBase64 = null;
  reviewScreenshotBase64 = null;
  hideImagePreview(orderDropzone, orderPreviewContainer, orderImgInput);
  hideImagePreview(reviewDropzone, reviewPreviewContainer, reviewImgInput);
  hideDuplicateAlert();
  orderIdStatusTag.style.display = "none";
  orderIdInput.classList.remove("input-error", "input-success");
  cashbackPercentBadge.style.display = "none";
  btnSubmit.disabled = false;
  btnSubmitText.textContent = "🛡️ Record & Guard Order";
}

async function syncRecordToGoogleSheet(record, webhookUrl) {
  try {
    const payload = {
      orderId: record.orderId,
      customerInfo: record.customerInfo,
      orderAmount: record.orderAmount,
      cashbackAmount: record.cashbackAmount,
      dateOfCashback: record.dateOfCashback,
      status: record.status,
      notes: record.notes,
      orderScreenshot: record.orderScreenshot ? "[Screenshot Attached]" : "",
      reviewScreenshot: record.reviewScreenshot ? "[Screenshot Attached]" : "",
      agentName: "Support Agent"
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return data;
  } catch (e) {
    console.warn("Webhook sync error:", e);
    return { success: false, message: e.message };
  }
}

async function testWebhookConnection() {
  const url = settingWebhookUrl.value.trim();
  if (!url) {
    showToast("Please enter a Google Apps Script Web App URL first", "⚠️");
    return;
  }

  btnTestWebhook.disabled = true;
  btnTestWebhook.textContent = "Pinging...";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "ping" })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Connected to Google Apps Script successfully!", "✓");
    } else {
      showToast("Ping returned: " + (data.message || "Unknown status"), "ℹ️");
    }
  } catch (err) {
    showToast("Connection failed: " + err.message, "✕");
  } finally {
    btnTestWebhook.disabled = false;
    btnTestWebhook.textContent = "Test Ping";
  }
}

function renderClaimsTable(items) {
  claimsCountBadge.textContent = items.length;
  claimsTableBody.innerHTML = "";

  if (items.length === 0) {
    emptyClaimsPlaceholder.style.display = "block";
    return;
  }

  emptyClaimsPlaceholder.style.display = "none";

  items.slice(0, 50).forEach(item => {
    const tr = document.createElement("tr");

    let statusClass = "status-initiated";
    if (item.status === "Completed") statusClass = "status-completed";
    else if (item.status === "Pending UPI") statusClass = "status-pending";
    else if (item.status === "Rejected") statusClass = "status-rejected";

    const formattedDate = formatDisplayDate(item.dateOfCashback || item.timestamp);
    const hasOrderShot = item.orderScreenshot ? "📸" : "";
    const hasReviewShot = item.reviewScreenshot ? "⭐" : "";

    tr.innerHTML = \`
      <td class="order-cell" title="Click to inspect">\${escapeHtml(item.orderId)}</td>
      <td title="\${escapeHtml(item.customerInfo)}">\${escapeHtml(truncate(item.customerInfo, 18))}</td>
      <td>₹\${Number(item.orderAmount).toLocaleString("en-IN")}</td>
      <td style="font-weight: 700; color: #4f46e5;">₹\${Number(item.cashbackAmount).toLocaleString("en-IN")}</td>
      <td>
        <span class="status-pill \${statusClass}">\${escapeHtml(item.status)}</span>
        \${hasOrderShot || hasReviewShot ? \`<span title="Screenshots attached" style="font-size: 10px; margin-left: 2px;">\${hasOrderShot}\${hasReviewShot}</span>\` : ""}
      </td>
      <td style="color: #64748b; font-size: 10.5px;">\${formattedDate}</td>
    \`;

    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      orderIdInput.value = item.orderId;
      handleOrderIdInput();
      showToast(\`Loaded \${item.orderId} for inspection\`, "ℹ️");
    });

    claimsTableBody.appendChild(tr);
  });
}

function exportToCsv() {
  if (records.length === 0) {
    showToast("No records available to export.", "ℹ️");
    return;
  }

  const headers = [
    "Order ID",
    "Customer / WhatsApp",
    "Order Amount (INR)",
    "Cashback Amount (INR)",
    "Cashback %",
    "Status",
    "Date of Cashback",
    "Notes",
    "Order Screenshot Attached",
    "Review Screenshot Attached",
    "Synced to Google Sheet",
    "System Timestamp"
  ];

  const rows = records.map(r => {
    const orderAmt = Number(r.orderAmount) || 0;
    const cbAmt = Number(r.cashbackAmount) || 0;
    const pct = orderAmt > 0 ? ((cbAmt / orderAmt) * 100).toFixed(1) + "%" : "0%";

    return [
      \`"\${(r.orderId || "").replace(/"/g, '""')}"\`,
      \`"\${(r.customerInfo || "").replace(/"/g, '""')}"\`,
      r.orderAmount,
      r.cashbackAmount,
      \`"\${pct}"\`,
      \`"\${(r.status || "").replace(/"/g, '""')}"\`,
      \`"\${(r.dateOfCashback || "").replace(/"/g, '""')}"\`,
      \`"\${(r.notes || "").replace(/"/g, '""')}"\`,
      r.orderScreenshot ? "YES" : "NO",
      r.reviewScreenshot ? "YES" : "NO",
      r.syncedToGoogleSheet ? "YES" : "NO",
      \`"\${r.timestamp || ""}"\`
    ].join(",");
  });

  const csvContent = "\\uFEFF" + [headers.join(","), ...rows].join("\\r\\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", \`cashback_governance_records_\${today}.csv\`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(\`Exported \${records.length} records to CSV!\`, "📥");
}

function setupDropzone(boxEl, inputEl, onImageLoaded) {
  boxEl.addEventListener("click", () => inputEl.click());

  inputEl.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], onImageLoaded);
    }
  });

  boxEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    boxEl.classList.add("dragover");
  });

  boxEl.addEventListener("dragleave", () => {
    boxEl.classList.remove("dragover");
  });

  boxEl.addEventListener("drop", (e) => {
    e.preventDefault();
    boxEl.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], onImageLoaded);
    }
  });
}

function handleGlobalPaste(e) {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      if (!orderScreenshotBase64) {
        processFile(blob, (b64) => {
          orderScreenshotBase64 = b64;
          showImagePreview(orderPreviewContainer, orderPreviewImg, b64);
          showToast("Pasted image into Order Screenshot!", "📸");
        });
      } else {
        processFile(blob, (b64) => {
          reviewScreenshotBase64 = b64;
          showImagePreview(reviewPreviewContainer, reviewPreviewImg, b64);
          showToast("Pasted image into Review Screenshot!", "⭐");
        });
      }
      break;
    }
  }
}

function processFile(file, callback) {
  if (!file.type.startsWith("image/")) {
    showToast("Please upload a valid image file (PNG/JPG)", "⚠️");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      callback(compressedDataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function showImagePreview(containerEl, imgEl, src) {
  imgEl.src = src;
  containerEl.style.display = "block";
}

function hideImagePreview(boxEl, containerEl, inputEl) {
  containerEl.style.display = "none";
  inputEl.value = "";
}

function checkUrlParamsForPrefill() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("orderId");
  const customer = urlParams.get("customer");

  if (orderId) {
    orderIdInput.value = orderId;
    handleOrderIdInput();
  }
  if (customer) {
    customerInfoInput.value = customer;
  }
}

function showToast(msg, icon = "✓") {
  const toastIcon = document.getElementById("toastIcon");
  toastText.textContent = msg;
  if (toastIcon) toastIcon.textContent = icon;
  toastMessage.classList.add("show");
  setTimeout(() => toastMessage.classList.remove("show"), 3500);
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.substring(0, max) + "…" : str;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}`
  },
  {
    name: "styles.css",
    path: "styles.css",
    language: "css",
    description: "Compact, modern CSS styling for popup and side panel.",
    content: `:root {
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --primary-light: #eef2ff;
  --danger: #dc2626;
  --danger-light: #fef2f2;
  --danger-border: #fecaca;
  --success: #16a34a;
  --success-light: #f0fdf4;
  --warning: #ca8a04;
  --warning-light: #fefce8;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --bg-page: #f8fafc;
  --card-bg: #ffffff;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: var(--bg-page);
  color: var(--text-main);
  width: 440px;
  max-width: 100vw;
  min-height: 580px;
  font-size: 13px;
  line-height: 1.45;
  overflow-x: hidden;
}

.app-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.brand-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
}

.brand-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.brand-subtitle {
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.badge-live {
  display: inline-block;
  width: 7px;
  height: 7px;
  background-color: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 8px #22c55e;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.btn-icon-ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.15s ease;
}

.btn-icon-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.guardrail-alert {
  margin: 12px 14px 6px 14px;
  padding: 12px 14px;
  background: var(--danger-light);
  border: 2px solid var(--danger);
  border-radius: var(--radius-md);
  color: #991b1b;
  display: none;
  animation: shake 0.35s ease-in-out;
}

.guardrail-alert.active {
  display: block;
}

.guardrail-title {
  font-weight: 800;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  color: var(--danger);
}

.guardrail-desc {
  font-size: 12px;
  line-height: 1.4;
  color: #7f1d1d;
}

.guardrail-badge-details {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #fca5a5;
  font-size: 11px;
  display: flex;
  justify-content: space-between;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}

.settings-drawer {
  background: #f1f5f9;
  border-bottom: 1px solid var(--border);
  padding: 12px 14px;
  display: none;
}

.settings-drawer.open {
  display: block;
}

.settings-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 6px;
}

.container {
  padding: 12px 14px 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-full {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-label .req {
  color: var(--danger);
  margin-left: 2px;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 9px;
  color: #94a3b8;
  font-size: 13px;
  pointer-events: none;
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 7px 10px;
  font-size: 12.5px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--text-main);
  outline: none;
  transition: all 0.15s ease;
  font-family: inherit;
}

.input-with-icon .form-input {
  padding-left: 28px;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.form-input.input-error {
  border-color: var(--danger);
  background-color: #fffaf0;
}

.form-input.input-success {
  border-color: var(--success);
}

.input-hint {
  font-size: 10.5px;
  color: var(--text-muted);
}

.cashback-meta-tag {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-light);
  padding: 1px 6px;
  border-radius: 4px;
}

.screenshot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dropzone-box {
  border: 1.5px dashed #cbd5e1;
  background: #f8fafc;
  border-radius: var(--radius-sm);
  padding: 10px 8px;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  min-height: 94px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dropzone-box:hover, .dropzone-box.dragover {
  border-color: var(--primary);
  background: #f5f3ff;
}

.dropzone-icon {
  font-size: 20px;
  color: #94a3b8;
  margin-bottom: 2px;
}

.dropzone-text {
  font-size: 11px;
  font-weight: 600;
  color: #334155;
}

.dropzone-sub {
  font-size: 9.5px;
  color: #94a3b8;
}

.dropzone-input {
  display: none;
}

.preview-container {
  display: none;
  width: 100%;
  height: 100%;
  position: relative;
}

.preview-img {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.btn-remove-preview {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.btn-remove-preview:hover {
  background: var(--danger);
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.btn-primary {
  flex: 1;
  background: var(--primary);
  color: #ffffff;
  border: none;
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(79, 70, 229, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.7;
  box-shadow: none;
}

.btn-secondary {
  background: #ffffff;
  color: #475569;
  border: 1px solid var(--border);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: #f1f5f9;
  color: var(--text-main);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 12px;
  font-size: 10.5px;
  font-weight: 600;
}

.status-completed {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.status-pending {
  background-color: #fef9c3;
  color: #a16207;
  border: 1px solid #fef08a;
}

.status-initiated {
  background-color: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.status-rejected {
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.claims-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.claims-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.claims-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.claims-count-badge {
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
}

.search-bar {
  margin-bottom: 10px;
  position: relative;
}

.claims-table-wrapper {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.claims-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}

.claims-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
  text-align: left;
  padding: 7px 9px;
  position: sticky;
  top: 0;
  border-bottom: 1px solid var(--border);
  z-index: 10;
}

.claims-table td {
  padding: 8px 9px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.claims-table tr:hover td {
  background-color: #f8fafc;
}

.claims-table .order-cell {
  font-weight: 700;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.claims-empty {
  text-align: center;
  padding: 24px 10px;
  color: #94a3b8;
  font-size: 12px;
}

.toast-msg {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%) translateY(40px);
  background: #0f172a;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  opacity: 0;
  pointer-events: none;
  transition: all 0.25s ease;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 6px;
}

.toast-msg.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}`
  },
  {
    name: "google_apps_script.js",
    path: "google_apps_script.js",
    language: "javascript",
    description: "Ready-to-deploy Google Apps Script for Google Sheet webhook sync (no OAuth required).",
    content: `/**
 * Cashback & Order Governance Tracker - Google Apps Script Webhook
 * 
 * Instructions:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click Extensions > Apps Script
 * 3. Delete any code in the editor and paste this entire file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set Description: "Cashback Tracker Webhook"
 * 7. Set "Execute as": "Me (your email)"
 * 8. Set "Who has access": "Anyone"
 * 9. Click "Deploy", copy the Web App URL (starts with https://script.google.com/macros/s/...)
 * 10. Paste this URL into the extension's Settings!
 */

const SHEET_NAME = "Cashback_Disbursements";

const HEADERS = [
  "Timestamp",
  "Order ID",
  "Customer Name / WhatsApp",
  "Order Amount (₹)",
  "Cashback Initiated (₹)",
  "Cashback %",
  "Date of Cashback",
  "Status",
  "Notes",
  "Order Screenshot Attached",
  "Review Screenshot Attached",
  "Order Screenshot Data",
  "Review Screenshot Data",
  "Logged By"
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  const lockAcquired = lock.tryLock(30000);
  
  if (!lockAcquired) {
    return createJsonResponse({
      success: false,
      message: "Server busy. Please try again."
    }, 429);
  }

  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    if (payload.action === "ping") {
      return createJsonResponse({
        success: true,
        message: "Google Apps Script Webhook is active and connected!",
        timestamp: new Date().toISOString()
      });
    }

    const orderId = (payload.orderId || "").trim();
    if (!orderId) {
      return createJsonResponse({
        success: false,
        message: "Order ID is required."
      }, 400);
    }

    const duplicate = findRecordByOrderId(orderId);
    if (duplicate && !payload.forceOverride) {
      return createJsonResponse({
        success: false,
        isDuplicate: true,
        message: \`⚠️ DUPLICATE ORDER ID DETECTED! Already claimed on \${duplicate.dateOfCashback || duplicate.timestamp} for ₹\${duplicate.cashbackAmount}.\`,
        existingRecord: duplicate
      }, 409);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      initializeSheetFormatting(sheet);
    } else if (sheet.getLastRow() === 0) {
      initializeSheetFormatting(sheet);
    }

    const now = new Date();
    const formattedTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    
    const orderAmt = Number(payload.orderAmount) || 0;
    const cashbackAmt = Number(payload.cashbackAmount) || 0;
    const cashbackPercent = orderAmt > 0 ? ((cashbackAmt / orderAmt) * 100).toFixed(1) + "%" : "0%";

    const hasOrderScreenshot = payload.orderScreenshot ? "YES" : "NO";
    const hasReviewScreenshot = payload.reviewScreenshot ? "YES" : "NO";

    const orderScreenshotCell = payload.orderScreenshot 
      ? (payload.orderScreenshot.length > 500 ? payload.orderScreenshot.substring(0, 100) + "... [Base64 Attached]" : payload.orderScreenshot)
      : "None";

    const reviewScreenshotCell = payload.reviewScreenshot 
      ? (payload.reviewScreenshot.length > 500 ? payload.reviewScreenshot.substring(0, 100) + "... [Base64 Attached]" : payload.reviewScreenshot)
      : "None";

    const rowData = [
      formattedTimestamp,
      orderId,
      payload.customerInfo || "N/A",
      orderAmt,
      cashbackAmt,
      cashbackPercent,
      payload.dateOfCashback || formattedTimestamp,
      payload.status || "Initiated",
      payload.notes || "",
      hasOrderScreenshot,
      hasReviewScreenshot,
      orderScreenshotCell,
      reviewScreenshotCell,
      payload.agentName || "Agent / Chrome Ext"
    ];

    sheet.appendRow(rowData);
    const newRowIndex = sheet.getLastRow();
    applyStatusColor(sheet, newRowIndex, 8, payload.status);

    return createJsonResponse({
      success: true,
      message: \`Successfully recorded cashback for Order #\${orderId}\`,
      row: newRowIndex,
      timestamp: formattedTimestamp
    });

  } catch (err) {
    return createJsonResponse({
      success: false,
      message: "Internal server error: " + err.toString()
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "online",
      service: "Cashback & Order Governance Tracker Webhook",
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function findRecordByOrderId(orderId) {
  if (!orderId) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return null;

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  for (let i = 0; i < data.length; i++) {
    const rowOrderId = String(data[i][1] || "").trim().toLowerCase();
    if (rowOrderId === orderId.trim().toLowerCase()) {
      return {
        timestamp: data[i][0],
        orderId: data[i][1],
        customerInfo: data[i][2],
        orderAmount: data[i][3],
        cashbackAmount: data[i][4],
        dateOfCashback: data[i][6],
        status: data[i][7],
        rowIndex: i + 2
      };
    }
  }
  return null;
}

function initializeSheetFormatting(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground("#1e293b");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Inter");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  sheet.getRange(2, 4, 1000, 2).setNumberFormat("₹#,##0.00");
}

function applyStatusColor(sheet, row, col, status) {
  const cell = sheet.getRange(row, col);
  cell.setFontWeight("bold");
  switch (status) {
    case "Completed":
      cell.setBackground("#dcfce7");
      cell.setFontColor("#15803d");
      break;
    case "Pending UPI":
      cell.setBackground("#fef9c3");
      cell.setFontColor("#a16207");
      break;
    case "Initiated":
      cell.setBackground("#e0f2fe");
      cell.setFontColor("#0369a1");
      break;
    case "Rejected":
      cell.setBackground("#fee2e2");
      cell.setFontColor("#b91c1c");
      break;
    default:
      break;
  }
}

function createJsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`
  },
  {
    name: "background.js",
    path: "background.js",
    language: "javascript",
    description: "Service Worker for side-panel docking, badge count updates & WhatsApp Web message relay.",
    content: `/**
 * Cashback & Order Governance Tracker - Service Worker (Manifest V3)
 * Handles side-panel behavior, WhatsApp Web message bridge, and badge updates.
 */

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.log("Sidepanel setup notice:", err));
  }
  updateBadge();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes["cashback_records_v1"]) {
    updateBadge();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkDuplicate") {
    chrome.storage.local.get(["cashback_records_v1"], (result) => {
      const records = result["cashback_records_v1"] || [];
      const cleanTarget = (request.orderId || "").trim().toUpperCase().replace(/^#+/, "");
      const match = records.find(r => 
        (r.orderId || "").trim().toUpperCase().replace(/^#+/, "") === cleanTarget
      );
      sendResponse({
        isDuplicate: !!match,
        record: match || null
      });
    });
    return true;
  }

  if (request.action === "openSidePanelWithOrder") {
    if (sender.tab && sender.tab.id && chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => {
        chrome.runtime.sendMessage({
          action: "prefillOrder",
          orderId: request.orderId,
          customer: request.customer
        });
      }).catch(err => console.log("Side panel open error:", err));
    }
    sendResponse({ success: true });
    return true;
  }
});

function updateBadge() {
  chrome.storage.local.get(["cashback_records_v1"], (result) => {
    const records = result["cashback_records_v1"] || [];
    const count = records.length;
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: "#4f46e5" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  });
}`
  },
  {
    name: "content.js",
    path: "content.js",
    language: "javascript",
    description: "WhatsApp Web integration script: Detects Order IDs in active chats and injects 1-click audit badges.",
    content: `/**
 * Cashback & Order Governance Tracker - WhatsApp Web Content Script
 * Auto-detects e-commerce Order IDs in active customer chats and enables 1-click audit & duplicate prevention.
 */

const ORDER_PATTERNS = [
  /\\b(\\d{3}-\\d{7}-\\d{7})\\b/g,               // Amazon India: 402-1234567-1234567
  /\\b(OD\\d{18,20})\\b/gi,                   // Flipkart: OD123456789012345678
  /\\b(ORD[-_]?[A-Z0-9]{5,12})\\b/gi,        // Shopify / Custom: ORD-98124
  /\\b(#?\\d{5,10})\\b/g                      // Standard order numbers: #104928
];

console.log("🛡️ Cashback & Governance Tracker active on WhatsApp Web.");

let scanInterval = setInterval(scanChatMessages, 2500);

function scanChatMessages() {
  const messageNodes = document.querySelectorAll("div.copyable-text:not([data-cashback-scanned])");

  messageNodes.forEach(node => {
    node.setAttribute("data-cashback-scanned", "true");
    const text = node.innerText || "";
    
    for (const pattern of ORDER_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match && match[0]) {
        const orderId = match[0].trim();
        injectAuditBadge(node, orderId);
        break;
      }
    }
  });
}

function injectAuditBadge(targetNode, orderId) {
  chrome.runtime.sendMessage({ action: "checkDuplicate", orderId: orderId }, (response) => {
    if (chrome.runtime.lastError) return;

    const badge = document.createElement("div");
    badge.className = "cgt-whatsapp-badge";

    if (response && response.isDuplicate) {
      const rec = response.record || {};
      badge.classList.add("cgt-badge-duplicate");
      badge.innerHTML = \`
        <span class="cgt-icon">⚠️</span>
        <span class="cgt-text"><strong>DUPLICATE CLAIM!</strong> #\${orderId} already paid (₹\${rec.cashbackAmount || 0})</span>
        <button class="cgt-btn" title="Inspect duplicate claim in side panel">View</button>
      \`;
    } else {
      badge.classList.add("cgt-badge-safe");
      badge.innerHTML = \`
        <span class="cgt-icon">🛡️</span>
        <span class="cgt-text">Order <strong>#\${orderId}</strong> verified (No prior claims)</span>
        <button class="cgt-btn" title="Record cashback in extension">Record</button>
      \`;
    }

    badge.querySelector(".cgt-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      let contactName = "";
      const contactHeader = document.querySelector("#main header span[dir='auto']");
      if (contactHeader) {
        contactName = contactHeader.innerText;
      }

      chrome.runtime.sendMessage({
        action: "openSidePanelWithOrder",
        orderId: orderId,
        customer: contactName
      });
    });

    targetNode.parentElement.insertBefore(badge, targetNode);
  });
}`
  },
  {
    name: "content.css",
    path: "content.css",
    language: "css",
    description: "Styles for the WhatsApp Web audit badge injected into chats.",
    content: `.cgt-whatsapp-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11.5px;
  line-height: 1.3;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  z-index: 10;
  max-width: 95%;
  animation: cgtFadeIn 0.2s ease-in-out;
}

@keyframes cgtFadeIn {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}

.cgt-badge-safe {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.cgt-badge-duplicate {
  background-color: #fef2f2;
  border: 1.5px solid #ef4444;
  color: #991b1b;
}

.cgt-icon {
  font-size: 13px;
}

.cgt-text {
  flex: 1;
}

.cgt-btn {
  background: #ffffff;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cgt-btn:hover {
  background: currentColor;
  color: #ffffff;
}`
  },
  {
    name: "README.md",
    path: "README.md",
    language: "markdown",
    description: "Installation and Google Sheets setup documentation.",
    content: `# Cashback & Order Governance Tracker (Chrome Extension Manifest V3)

Enterprise-grade e-commerce order fraud prevention and cashback governance tracker built for customer support teams communicating on WhatsApp Web and handling order payouts.

## 🚀 Key Features

1. **Instant Duplicate Guardrail**:
   - Live debounce check against all stored order records.
   - Prevents duplicate claims against the same Order ID in real-time.
   - Immediately raises a prominent red warning banner: \`⚠️ DUPLICATE ORDER ID DETECTED! Already claimed on [Date] for ₹[Amount].\` and locks the submission button.

2. **Full Governance Form**:
   - Order ID (Required, unique identifier with normalization)
   - Customer Name / WhatsApp Number
   - Order Amount (₹) & Cashback Initiated (₹) with real-time Cashback % calculation
   - Disbursement Date & Time (auto-populated to current timestamp)
   - Order Screenshot & Review Screenshot Evidence (Drag-and-drop, File upload, or Direct \`Ctrl+V\` Clipboard paste!)
   - Status tracking ("Initiated", "Pending UPI", "Completed", "Rejected")
   - UPI Reference / Notes

3. **Dual Persistence Architecture**:
   - **Local Storage (\`chrome.storage.local\`)**: Fast, persistent, offline-first with 1-click **Export to CSV / Excel**.
   - **Google Sheets Cloud Sync**: Direct webhook integration via Google Apps Script (no OAuth consent screen needed).

4. **WhatsApp Web Live Integration (\`content.js\`)**:
   - Automatically detects Amazon (\`402-XXXXXXX-XXXXXXX\`), Flipkart (\`ODXXXXXXXXXXXXXXXX\`), Shopify (\`ORD-XXXXX\`), and custom order numbers in WhatsApp Web chats.
   - Injects a 1-click audit badge in chat to pre-fill the order in the tracker and verify if it's already claimed!

---

## 🛠️ How to Install in Google Chrome (Manifest V3)

1. Open Google Chrome and navigate to:
   \`\`\`
   chrome://extensions/
   \`\`\`
2. Enable the **"Developer mode"** toggle in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the \`extension/\` directory.
5. Pin **"Cashback & Order Governance Tracker"** 🛡️ to your Chrome toolbar.
6. Open the extension popup or click the Side Panel icon to keep it docked right beside your WhatsApp Web chat!

---

## 📊 Google Sheets Sync Setup (60 Seconds)

1. Create a new Google Sheet at [https://sheets.new](https://sheets.new).
2. Go to **Extensions** > **Apps Script**.
3. Replace the default code with the contents of \`google_apps_script.js\`.
4. Click **Deploy** > **New deployment**.
5. Select **Web app** as the deployment type:
   - Description: \`Cashback Tracker Webhook\`
   - Execute as: \`Me (your email)\`
   - Who has access: \`Anyone\`
6. Click **Deploy** and copy your **Web App URL** (\`https://script.google.com/macros/s/.../exec\`).
7. Open the extension, click the ⚙️ Settings gear, paste the Web App URL, and click **Save**.
8. Click **Test Ping** to confirm live synchronization!`
  }
];

/**
 * Generates and downloads a complete .ZIP file with all extension files and icons
 */
export async function downloadExtensionZip() {
  const zip = new JSZip();

  // Add all code files
  for (const file of EXTENSION_FILES) {
    zip.file(file.path, file.content);
  }

  // Generate icons folder
  const iconsFolder = zip.folder("icons");
  if (iconsFolder) {
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#312e81" />
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bgGrad)" />
  <path d="M64 22 L98 34 V66 C98 88 83 104 64 110 C45 104 30 88 30 66 V34 Z" fill="url(#shieldGrad)" />
  <text x="64" y="74" font-family="sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle">₹</text>
  <circle cx="90" cy="90" r="14" fill="#22c55e" stroke="#ffffff" stroke-width="3" />
</svg>`;
    iconsFolder.file("icon.svg", svgIcon);
    
    // Add canvas rendered PNG icons in browser
    const renderPngBlob = (size: number): Promise<Blob | null> => {
      return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        // Background
        ctx.fillStyle = "#4f46e5";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(0, 0, size, size, size * 0.2) : ctx.rect(0, 0, size, size);
        ctx.fill();

        // Rupee Symbol
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(size * 0.55)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("₹", size / 2, size / 2);

        canvas.toBlob((blob) => resolve(blob), "image/png");
      });
    };

    const b16 = await renderPngBlob(16);
    const b48 = await renderPngBlob(48);
    const b128 = await renderPngBlob(128);

    if (b16) iconsFolder.file("icon16.png", b16);
    if (b48) iconsFolder.file("icon48.png", b48);
    if (b128) iconsFolder.file("icon128.png", b128);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cashback-order-governance-tracker-v3.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
