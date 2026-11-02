/**
 * Chrome Extension Source Files for inspection and ZIP packaging
 * Dynamically imports raw source files from /extension directory
 */
import JSZip from 'jszip';

import manifestRaw from '../extension/manifest.json?raw';
import popupHtmlRaw from '../extension/popup.html?raw';
import popupJsRaw from '../extension/popup.js?raw';
import stylesCssRaw from '../extension/styles.css?raw';
import googleAppsScriptRaw from '../extension/google_apps_script.js?raw';
import backgroundJsRaw from '../extension/background.js?raw';
import contentJsRaw from '../extension/content.js?raw';
import contentCssRaw from '../extension/content.css?raw';
import readmeRaw from '../extension/README.md?raw';

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
    content: manifestRaw
  },
  {
    name: "popup.html",
    path: "popup.html",
    language: "html",
    description: "Extension UI with duplicate alert banner, screenshot dropzones, and recent claims table.",
    content: popupHtmlRaw
  },
  {
    name: "popup.js",
    path: "popup.js",
    language: "javascript",
    description: "Core logic: Real-time duplicate checking, screenshot handlers, storage & Google Sheets sync.",
    content: popupJsRaw
  },
  {
    name: "styles.css",
    path: "styles.css",
    language: "css",
    description: "Compact, modern CSS styling for popup and side panel.",
    content: stylesCssRaw
  },
  {
    name: "google_apps_script.js",
    path: "google_apps_script.js",
    language: "javascript",
    description: "Ready-to-deploy Google Apps Script for bidirectional Google Sheet webhook sync (no OAuth required).",
    content: googleAppsScriptRaw
  },
  {
    name: "background.js",
    path: "background.js",
    language: "javascript",
    description: "Service Worker for side-panel docking, badge count updates & WhatsApp Web message relay.",
    content: backgroundJsRaw
  },
  {
    name: "content.js",
    path: "content.js",
    language: "javascript",
    description: "WhatsApp Web integration script: Detects Order IDs in active chats and injects 1-click audit badges.",
    content: contentJsRaw
  },
  {
    name: "content.css",
    path: "content.css",
    language: "css",
    description: "Styles for the WhatsApp Web audit badge injected into chats.",
    content: contentCssRaw
  },
  {
    name: "README.md",
    path: "README.md",
    language: "markdown",
    description: "Installation and Google Sheets setup documentation.",
    content: readmeRaw
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
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(0, 0, size, size, size * 0.2);
        } else {
          ctx.rect(0, 0, size, size);
        }
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
