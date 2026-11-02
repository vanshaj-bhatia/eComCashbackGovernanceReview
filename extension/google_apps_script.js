/**
 * Cashback & Order Governance Tracker - Google Apps Script Webhook
 * Supports bidirectional sync: Append new claims + Read all claims across devices
 * 
 * Instructions for deployment:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Click Extensions > Apps Script
 * 3. Delete any code in the editor and paste this entire file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set Description: "Cashback Tracker Webhook v2"
 * 7. Set "Execute as": "Me (your email)"
 * 8. Set "Who has access": "Anyone" (allows mobile devices & Chrome extension to GET/POST without OAuth prompt)
 * 9. Click "Deploy", copy the Web App URL (starts with https://script.google.com/macros/s/...)
 * 10. Paste this URL into the app's "Google Sheet Web App URL" field in Settings!
 */

const SHEET_NAME = "Cashback_Disbursements";

// Define the standard columns for the governance sheet
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

/**
 * Handles incoming POST requests (Disbursement recording + Remote query)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent requests from multiple devices
  const lockAcquired = lock.tryLock(30000);
  
  if (!lockAcquired) {
    return createJsonResponse({
      success: false,
      message: "Server busy. Please try again in a few seconds."
    }, 429);
  }

  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }

    // Ping / Test Connection Action
    if (payload.action === "ping") {
      return createJsonResponse({
        success: true,
        message: "Google Apps Script Webhook is active and connected!",
        timestamp: new Date().toISOString()
      });
    }

    // Fetch / Sync All Records Action (for clients that prefer POST)
    if (payload.action === "getRecords" || payload.action === "fetch") {
      const records = getAllRecordsFromSheet();
      return createJsonResponse({
        success: true,
        records: records,
        total: records.length,
        timestamp: new Date().toISOString()
      });
    }

    // Duplicate Check Action (Optional remote query)
    if (payload.action === "checkDuplicate") {
      const orderIdToCheck = (payload.orderId || "").trim();
      const existing = findRecordByOrderId(orderIdToCheck);
      return createJsonResponse({
        success: true,
        isDuplicate: !!existing,
        existingRecord: existing
      });
    }

    // Update / Edit Record Action
    if (payload.action === "updateRecord" || payload.action === "edit") {
      const orderIdToUpdate = (payload.orderId || "").trim();
      if (!orderIdToUpdate) {
        return createJsonResponse({ success: false, message: "Order ID is required to update." }, 400);
      }

      const existing = findRecordByOrderId(orderIdToUpdate);
      if (!existing) {
        return createJsonResponse({ success: false, message: `Order #${orderIdToUpdate} not found in sheet.` }, 404);
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME);
      const row = existing.rowIndex;

      const orderAmt = Number(payload.orderAmount) || 0;
      const cashbackAmt = Number(payload.cashbackAmount) || 0;
      const cashbackPercent = orderAmt > 0 ? ((cashbackAmt / orderAmt) * 100).toFixed(1) + "%" : "0%";

      if (payload.customerInfo !== undefined) sheet.getRange(row, 3).setValue(payload.customerInfo);
      if (payload.orderAmount !== undefined) sheet.getRange(row, 4).setValue(orderAmt);
      if (payload.cashbackAmount !== undefined) {
        sheet.getRange(row, 5).setValue(cashbackAmt);
        sheet.getRange(row, 6).setValue(cashbackPercent);
      }
      if (payload.dateOfCashback !== undefined) sheet.getRange(row, 7).setValue(payload.dateOfCashback);
      if (payload.status !== undefined) {
        sheet.getRange(row, 8).setValue(payload.status);
        applyStatusColor(sheet, row, 8, payload.status);
      }
      if (payload.notes !== undefined) sheet.getRange(row, 9).setValue(payload.notes);

      return createJsonResponse({
        success: true,
        message: `Order #${orderIdToUpdate} updated in Google Sheet.`,
        row: row
      });
    }

    // Delete Record Action
    if (payload.action === "deleteRecord" || payload.action === "delete") {
      const orderIdToDelete = (payload.orderId || "").trim();
      if (!orderIdToDelete) {
        return createJsonResponse({ success: false, message: "Order ID is required to delete." }, 400);
      }

      const existing = findRecordByOrderId(orderIdToDelete);
      if (!existing) {
        return createJsonResponse({ success: false, message: `Order #${orderIdToDelete} not found in sheet.` }, 404);
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME);
      sheet.deleteRow(existing.rowIndex);

      return createJsonResponse({
        success: true,
        message: `Order #${orderIdToDelete} deleted from Google Sheet.`
      });
    }

    // Record Cashback Disbursement Action
    const orderId = (payload.orderId || "").trim();
    if (!orderId) {
      return createJsonResponse({
        success: false,
        message: "Order ID is required."
      }, 400);
    }

    // Enforce duplicate prevention in Google Sheets across all devices
    const duplicate = findRecordByOrderId(orderId);
    if (duplicate && !payload.forceOverride) {
      return createJsonResponse({
        success: false,
        isDuplicate: true,
        message: `⚠️ DUPLICATE ORDER ID DETECTED! Already claimed on ${duplicate.dateOfCashback || duplicate.timestamp} for ₹${duplicate.cashbackAmount}.`,
        existingRecord: duplicate
      }, 409);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // Auto-create sheet and styling if not present
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

    // Truncate or link screenshot payload to avoid 50k cell character limits
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
      payload.agentName || "Agent / Mobile"
    ];

    sheet.appendRow(rowData);
    const newRowIndex = sheet.getLastRow();

    // Apply color badge to status cell
    applyStatusColor(sheet, newRowIndex, 8, payload.status);

    return createJsonResponse({
      success: true,
      message: `Successfully recorded cashback for Order #${orderId}`,
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

/**
 * Handles incoming GET requests
 * By default, returns all existing records from the sheet for cross-device synchronization on page load!
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "getRecords";

  if (action === "ping") {
    return createJsonResponse({
      success: true,
      status: "online",
      service: "Cashback & Order Governance Tracker Webhook",
      timestamp: new Date().toISOString()
    });
  }

  // Default GET action: Read and return all records for sync
  try {
    const records = getAllRecordsFromSheet();
    return createJsonResponse({
      success: true,
      records: records,
      total: records.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: "Failed to read records from sheet: " + err.toString(),
      records: []
    }, 500);
  }
}

/**
 * Reads all records from the sheet to synchronize across devices
 */
function getAllRecordsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }

  const numRows = sheet.getLastRow() - 1;
  const values = sheet.getRange(2, 1, numRows, HEADERS.length).getValues();
  const records = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const orderId = String(row[1] || "").trim();
    if (!orderId) continue;

    let timestampStr = "";
    if (row[0] instanceof Date) {
      timestampStr = Utilities.formatDate(row[0], Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
    } else {
      timestampStr = String(row[0] || "");
    }

    let dateOfCashbackStr = "";
    if (row[6] instanceof Date) {
      dateOfCashbackStr = Utilities.formatDate(row[6], Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm");
    } else {
      dateOfCashbackStr = String(row[6] || "");
    }

    records.push({
      id: "sheet_row_" + (i + 2),
      timestamp: timestampStr,
      orderId: orderId,
      customerInfo: String(row[2] || ""),
      orderAmount: Number(row[3]) || 0,
      cashbackAmount: Number(row[4]) || 0,
      dateOfCashback: dateOfCashbackStr,
      status: String(row[7] || "Completed"),
      notes: String(row[8] || ""),
      hasOrderScreenshot: String(row[9] || "").toUpperCase() === "YES",
      hasReviewScreenshot: String(row[10] || "").toUpperCase() === "YES",
      orderScreenshot: null,
      reviewScreenshot: null,
      syncedToGoogleSheet: true,
      agentName: String(row[13] || "")
    });
  }

  // Return newest first (reverse chronological order)
  return records.reverse();
}

/**
 * Searches the active sheet for any existing record with the given Order ID
 */
function findRecordByOrderId(orderId) {
  if (!orderId) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return null;

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues();
  const target = orderId.trim().toUpperCase().replace(/^#+/, "");

  for (let i = 0; i < data.length; i++) {
    const rawOrderId = String(data[i][1] || "").trim().toUpperCase().replace(/^#+/, "");
    if (rawOrderId === target) {
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

/**
 * Sets up aesthetic header styling and column freeze
 */
function initializeSheetFormatting(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  
  // Style headers
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground("#1e293b"); // Slate 800
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontFamily("Inter");
  headerRange.setHorizontalAlignment("center");
  
  sheet.setFrozenRows(1);
  
  // Format numeric columns as Currency ₹
  sheet.getRange(2, 4, 1000, 2).setNumberFormat("₹#,##0.00");
}

/**
 * Applies subtle background colors according to Status
 */
function applyStatusColor(sheet, row, col, status) {
  const cell = sheet.getRange(row, col);
  cell.setFontWeight("bold");
  switch (status) {
    case "Completed":
      cell.setBackground("#dcfce7"); // Green 100
      cell.setFontColor("#15803d"); // Green 700
      break;
    case "Pending UPI":
      cell.setBackground("#fef9c3"); // Yellow 100
      cell.setFontColor("#a16207"); // Yellow 700
      break;
    case "Initiated":
      cell.setBackground("#e0f2fe"); // Sky 100
      cell.setFontColor("#0369a1"); // Sky 700
      break;
    case "Rejected":
      cell.setBackground("#fee2e2"); // Red 100
      cell.setFontColor("#b91c1c"); // Red 700
      break;
    default:
      break;
  }
}

/**
 * Helper to construct JSON response
 */
function createJsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
