import React, { useState } from 'react';
import { EXTENSION_FILES, downloadExtensionZip, ExtensionFile } from '../extensionCode';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  FolderArchive, 
  FileJson, 
  FileSpreadsheet, 
  Terminal, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

export const CodeInspector: React.FC = () => {
  const [selectedFileName, setSelectedFileName] = useState<string>('manifest.json');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const currentFile = EXTENSION_FILES.find((f) => f.name === selectedFileName) || EXTENSION_FILES[0];

  const handleCopy = (content: string, name: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(name);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadExtensionZip();
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const lineCount = currentFile.content.split('\n').length;
  const byteCount = new Blob([currentFile.content]).size;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
      
      {/* Action Header */}
      <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm tracking-tight">Chrome Extension Source Code (Manifest V3)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete, production-ready files ready to load directly into Google Chrome.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCopy(currentFile.content, currentFile.name)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {copiedFile === currentFile.name ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy {currentFile.name}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Download className={`w-3.5 h-3.5 ${isZipping ? 'animate-bounce' : ''}`} />
            <span>{isZipping ? 'Packaging ZIP...' : 'Download Extension (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Main Code View Area */}
      <div className="flex flex-col md:flex-row min-h-[520px]">
        
        {/* File Navigator Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-2 space-y-1 shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">
            Extension Files
          </div>

          {EXTENSION_FILES.map((file) => {
            const isSelected = file.name === selectedFileName;
            return (
              <button
                key={file.name}
                type="button"
                onClick={() => setSelectedFileName(file.name)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate font-mono">{file.name}</span>
                </div>
                {file.name === 'google_apps_script.js' && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    GAS
                  </span>
                )}
                {file.name === 'manifest.json' && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                    V3
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 border-t border-slate-200 px-2 mt-4 space-y-2">
            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span>Chrome Load Unpacked:</span>
            </div>
            <ol className="text-[10.5px] text-slate-500 space-y-1 list-decimal list-inside leading-snug">
              <li>Download & extract ZIP</li>
              <li>Go to <code className="bg-slate-200 px-1 py-0.2 rounded text-[10px]">chrome://extensions</code></li>
              <li>Turn on <strong>Developer mode</strong></li>
              <li>Click <strong>Load unpacked</strong></li>
            </ol>
          </div>
        </div>

        {/* Code Content & Stats */}
        <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
          
          {/* File Meta Header */}
          <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-indigo-400">{currentFile.path}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 text-[11px]">{currentFile.description}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
              <span>{lineCount} lines</span>
              <span>{(byteCount / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          {/* Syntax Code Container */}
          <div className="flex-1 p-4 overflow-auto font-mono text-[11.5px] leading-relaxed text-slate-200 max-h-[540px]">
            <pre className="whitespace-pre">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>

      </div>

    </div>
  );
};
