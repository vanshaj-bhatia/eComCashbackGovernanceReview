/**
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

/**
 * Storage Abstraction: Works with chrome.storage.local or fallback localStorage
 */
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

/**
 * Pre-populate current local timestamp in format YYYY-MM-DDTHH:mm
 */
function initDefaultDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  dateOfCashbackInput.value = now.toISOString().slice(0, 16);
}

/**
 * Load settings (Google Sheet Webhook URL, Auto Sync flag)
 */
async function loadSettings() {
  const saved = await storage.get(STORAGE_KEY_SETTINGS);
  if (saved) {
    settings = { ...settings, ...saved };
  }
  if (settingWebhookUrl) settingWebhookUrl.value = settings.webhookUrl || "";
  if (settingAutoSync) settingAutoSync.checked = settings.autoSync !== false;
}

/**
 * Load all stored cashback claims from storage
 */
async function loadRecords() {
  const saved = await storage.get(STORAGE_KEY_RECORDS);
  records = Array.isArray(saved) ? saved : [];
  renderClaimsTable(records);
}

/**
 * Event Listeners registration
 */
function setupEventListeners() {
  // Real-time Order ID duplicate detection
  orderIdInput.addEventListener("input", handleOrderIdInput);
  orderIdInput.addEventListener("paste", () => setTimeout(handleOrderIdInput, 50));

  // Auto-calculate Cashback % badge
  orderAmountInput.addEventListener("input", updateCashbackPercentage);
  cashbackAmountInput.addEventListener("input", updateCashbackPercentage);

  // Form Submission
  form.addEventListener("submit", handleFormSubmit);
  btnReset.addEventListener("click", resetForm);

  // Search Filter
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

  // Export to CSV
  btnExportCsv.addEventListener("click", exportToCsv);

  // Settings Drawer Toggle & Save
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

  // Open side panel if available in Chrome MV3
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

  // Screenshot Dropzones & Inputs
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

  // Clipboard Paste listener for entire document: Paste image directly into active or open dropzone
  window.addEventListener("paste", handleGlobalPaste);
}

/**
 * Normalizes Order IDs for robust fraud prevention (trims, uppercase, removes leading #)
 */
function normalizeOrderId(id) {
  if (!id) return "";
  return id.trim().replace(/^#+/, "").toUpperCase();
}

/**
 * Duplicate Prevention Guardrail Handler
 */
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

  // Look for match in existing records
  const match = records.find(r => normalizeOrderId(r.orderId) === cleanId);

  if (match) {
    // DUPLICATE DETECTED! Trigger Guardrail Warning
    activeDuplicate = match;
    duplicateAlertText.innerHTML = `⚠️ Order <strong>#${match.orderId}</strong> was already claimed! To prevent duplicate payout fraud, submission has been locked.`;
    duplicateAlertDate.textContent = `Claimed on: ${formatDisplayDate(match.dateOfCashback || match.timestamp)}`;
    duplicateAlertAmount.textContent = `Amount: ₹${match.cashbackAmount || 0} (${match.status || "Completed"})`;
    
    duplicateAlert.classList.add("active");
    orderIdInput.classList.add("input-error");
    orderIdInput.classList.remove("input-success");
    orderIdStatusTag.style.display = "none";
    btnSubmit.disabled = true;
    btnSubmitText.textContent = "🚫 Blocked: Duplicate Order ID";
  } else {
    // Unique ID: Clear alert and mark available
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

/**
 * Calculates and updates the cashback percentage tag
 */
function updateCashbackPercentage() {
  const orderAmt = parseFloat(orderAmountInput.value) || 0;
  const cashbackAmt = parseFloat(cashbackAmountInput.value) || 0;

  if (orderAmt > 0 && cashbackAmt >= 0) {
    const pct = ((cashbackAmt / orderAmt) * 100).toFixed(1);
    cashbackPercentBadge.textContent = `${pct}%`;
    cashbackPercentBadge.style.display = "inline-block";
  } else {
    cashbackPercentBadge.style.display = "none";
  }
}

/**
 * Form Submit Handler
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const cleanId = normalizeOrderId(orderIdInput.value);
  if (!cleanId) {
    showToast("Please enter an Order ID", "⚠️");
    orderIdInput.focus();
    return;
  }

  // Double check duplicate guardrail before saving
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

  // Construct new claim record
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
    // 1. Save locally to chrome.storage
    records.unshift(newRecord);
    await storage.set(STORAGE_KEY_RECORDS, records);
    renderClaimsTable(records);

    // 2. Sync to Google Apps Script Webhook if configured
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

    // Reset form after successful submission
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

/**
 * Resets form fields and screenshot previews
 */
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

/**
 * Syncs an individual record to the Google Apps Script Webhook
 */
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
      headers: {
        "Content-Type": "text/plain;charset=utf-8" // Use text/plain to avoid CORS preflight options issues with Apps Script
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return data;
  } catch (e) {
    console.warn("Webhook sync error:", e);
    return { success: false, message: e.message };
  }
}

/**
 * Tests Google Apps Script Webhook URL connectivity
 */
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

/**
 * Render Recent Claims Table
 */
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

    // Status Pill Class
    let statusClass = "status-initiated";
    if (item.status === "Completed") statusClass = "status-completed";
    else if (item.status === "Pending UPI") statusClass = "status-pending";
    else if (item.status === "Rejected") statusClass = "status-rejected";

    const formattedDate = formatDisplayDate(item.dateOfCashback || item.timestamp);
    const hasOrderShot = item.orderScreenshot ? "📸" : "";
    const hasReviewShot = item.reviewScreenshot ? "⭐" : "";

    tr.innerHTML = `
      <td class="order-cell" title="Click to inspect">${escapeHtml(item.orderId)}</td>
      <td title="${escapeHtml(item.customerInfo)}">${escapeHtml(truncate(item.customerInfo, 18))}</td>
      <td>₹${Number(item.orderAmount).toLocaleString("en-IN")}</td>
      <td style="font-weight: 700; color: #4f46e5;">₹${Number(item.cashbackAmount).toLocaleString("en-IN")}</td>
      <td>
        <span class="status-pill ${statusClass}">${escapeHtml(item.status)}</span>
        ${hasOrderShot || hasReviewShot ? `<span title="Screenshots attached" style="font-size: 10px; margin-left: 2px;">${hasOrderShot}${hasReviewShot}</span>` : ""}
      </td>
      <td style="color: #64748b; font-size: 10.5px;">${formattedDate}</td>
    `;

    // Clicking row pre-fills or tests order
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      orderIdInput.value = item.orderId;
      handleOrderIdInput();
      showToast(`Loaded ${item.orderId} for inspection`, "ℹ️");
    });

    claimsTableBody.appendChild(tr);
  });
}

/**
 * Export claims to CSV / Excel
 */
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
      `"${(r.orderId || "").replace(/"/g, '""')}"`,
      `"${(r.customerInfo || "").replace(/"/g, '""')}"`,
      r.orderAmount,
      r.cashbackAmount,
      `"${pct}"`,
      `"${(r.status || "").replace(/"/g, '""')}"`,
      `"${(r.dateOfCashback || "").replace(/"/g, '""')}"`,
      `"${(r.notes || "").replace(/"/g, '""')}"`,
      r.orderScreenshot ? "YES" : "NO",
      r.reviewScreenshot ? "YES" : "NO",
      r.syncedToGoogleSheet ? "YES" : "NO",
      `"${r.timestamp || ""}"`
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `cashback_governance_records_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Exported ${records.length} records to CSV!`, "📥");
}

/**
 * Setup Dropzone handlers for Drag-and-Drop and File inputs
 */
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

/**
 * Handle Global Clipboard Paste (Ctrl+V / Cmd+V)
 */
function handleGlobalPaste(e) {
  // If user is focused on a text input, don't hijack unless it's an image
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      // Target orderScreenshot first if empty, else reviewScreenshot
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

/**
 * Reads image file and compresses to reasonable base64 dimensions
 */
function processFile(file, callback) {
  if (!file.type.startsWith("image/")) {
    showToast("Please upload a valid image file (PNG/JPG)", "⚠️");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Compress if larger than 1200px width/height for fast storage
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

/**
 * Check if URL parameters have prefill data (e.g. from WhatsApp Web content script click)
 */
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

/**
 * Display toast notification
 */
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
}
