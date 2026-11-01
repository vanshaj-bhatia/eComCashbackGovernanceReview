import React, { useState } from 'react';
import { CashbackRecord } from '../types';
import { EXTENSION_FILES } from '../extensionCode';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  Send,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface Props {
  records: CashbackRecord[];
  webhookUrl: string;
  onUpdateWebhookUrl: (url: string) => void;
}

export const GoogleSheetsGuide: React.FC<Props> = ({
  records,
  webhookUrl,
  onUpdateWebhookUrl
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [testUrl, setTestUrl] = useState(webhookUrl);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const gasFile = EXTENSION_FILES.find((f) => f.name === 'google_apps_script.js');

  const handleCopyScript = () => {
    if (gasFile) {
      navigator.clipboard.writeText(gasFile.content);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    }
  };

  const handleRunPingTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrl.trim()) return;

    setIsLoading(true);
    setTestResult(null);

    try {
      const res = await fetch(testUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping' })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          status: 'success',
          message: 'Connection successful! Webhook is live: ' + data.message
        });
        onUpdateWebhookUrl(testUrl.trim());
      } else {
        setTestResult({
          status: 'warning',
          message: 'Webhook reached with notice: ' + (data.message || 'No details')
        });
      }
    } catch (err: unknown) {
      setTestResult({
        status: 'error',
        message: 'Ping failed: ' + (err instanceof Error ? err.message : String(err)) + '. Ensure Web App deployment is set to "Anyone".'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                Google Sheets Real-Time Cloud Sync (No OAuth Required)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every cashback claim recorded in the Chrome extension can instantly append a formatted row to your team's Google Sheet.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyScript}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
          >
            {copiedScript ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Script Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy google_apps_script.js</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Steps Deployment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">1</div>
            <div className="font-bold text-slate-800">Create Sheet</div>
            <p className="text-slate-500 text-[11px] leading-tight">
              Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-600 underline">sheets.new</a>, then click <strong>Extensions &gt; Apps Script</strong>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">2</div>
            <div className="font-bold text-slate-800">Paste Script</div>
            <p className="text-slate-500 text-[11px] leading-tight">
              Paste the code from <code className="bg-slate-200 px-1 rounded">google_apps_script.js</code> into the script editor.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">3</div>
            <div className="font-bold text-slate-800">Deploy as Web App</div>
            <p className="text-slate-500 text-[11px] leading-tight">
              Click <strong>Deploy &gt; New deployment</strong>, choose <strong>Web app</strong>, execute as <em>Me</em>, access: <em>Anyone</em>.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px]">4</div>
            <div className="font-bold text-slate-800">Connect Extension</div>
            <p className="text-slate-500 text-[11px] leading-tight">
              Copy the resulting Web App URL and paste it below or into the extension settings.
            </p>
          </div>
        </div>

        {/* Live Webhook Tester */}
        <form onSubmit={handleRunPingTest} className="mt-5 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2.5">
          <label htmlFor="testUrlInput" className="block text-xs font-bold text-emerald-950">
            <span>Test Your Web App URL:</span>
          </label>
          <div className="flex gap-2">
            <input
              id="testUrlInput"
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 px-3 py-1.5 text-xs rounded border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
            />
            <button
              type="submit"
              disabled={isLoading || !testUrl.trim()}
              className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          {testResult && (
            <div className={`p-2.5 rounded text-xs font-medium ${
              testResult.status === 'success'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : testResult.status === 'warning'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-red-100 text-red-900 border border-red-300'
            }`}>
              {testResult.message}
            </div>
          )}
        </form>
      </div>

      {/* Spreadsheet Visualization Preview */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3.5 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight">
              Live Google Sheets Representation
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              [Sheet: Cashback_Disbursements]
            </span>
          </div>
          <span className="text-[10px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded font-medium">
            Auto-formatted with freeze header & status pills
          </span>
        </div>

        <div className="overflow-x-auto max-h-[320px]">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-slate-900 text-white font-bold sticky top-0">
              <tr>
                <th className="py-2 px-3 border-r border-slate-800">Timestamp</th>
                <th className="py-2 px-3 border-r border-slate-800">Order ID</th>
                <th className="py-2 px-3 border-r border-slate-800">Customer Name / WhatsApp</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Order Amt (₹)</th>
                <th className="py-2 px-3 border-r border-slate-800 text-right">Cashback (₹)</th>
                <th className="py-2 px-3 border-r border-slate-800 text-center">Cashback %</th>
                <th className="py-2 px-3 border-r border-slate-800">Disbursement Date</th>
                <th className="py-2 px-3 border-r border-slate-800 text-center">Status</th>
                <th className="py-2 px-3 border-r border-slate-800">Notes / UPI Ref</th>
                <th className="py-2 px-3 text-center">Evidence Attached</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
              {records.length > 0 ? (
                records.map((r, idx) => {
                  const pct = r.orderAmount > 0 ? ((r.cashbackAmount / r.orderAmount) * 100).toFixed(1) + '%' : '0%';
                  return (
                    <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {r.timestamp ? r.timestamp.replace('T', ' ').substring(0, 19) : '--'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.orderId}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-800">
                        {r.customerInfo}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        ₹{Number(r.orderAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                        ₹{Number(r.cashbackAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-indigo-600">
                        {pct}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 text-[11px]">
                        {r.dateOfCashback || '--'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          r.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'Pending UPI'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px] max-w-[160px] truncate">
                        {r.notes || '--'}
                      </td>
                      <td className="py-2 px-3 text-center font-semibold text-[11px]">
                        {r.orderScreenshot || r.reviewScreenshot ? (
                          <span className="text-emerald-600">YES (2 proofs)</span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    No records synchronized yet. Submit a claim in the Extension Sandbox to populate!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
