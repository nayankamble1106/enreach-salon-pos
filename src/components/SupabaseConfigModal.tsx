import React, { useState, useEffect } from 'react';
import { Database, X, CheckCircle2, AlertCircle, Shield, RefreshCw, KeyRound, Globe, Sparkles } from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured,
} from '../services/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    // Temporarily save to test
    setIsTesting(true);
    setTestResult(null);
    saveSupabaseConfig(url, anonKey);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    saveSupabaseConfig(url, anonKey);
    setTimeout(() => {
      setIsSaving(false);
      onConfigSaved();
      onClose();
    }, 300);
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close Database Settings"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 shadow-xs">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-900">Supabase Cloud Database</h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isConfigured ? 'Active' : 'Volatile Cloud'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              0% Phone Memory • Multi-Device Cloud Sync • Zero Lagging
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Permanent Multi-Year Cloud Storage</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            All daily bills, sales history, customer mobile history, and staff performance are stored directly in your Supabase cloud database. No sales data is saved on phone storage.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>Supabase Project URL</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Supabase Public Anon Key</span>
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Found in Supabase Dashboard → Settings → API → Project API keys (anon public).
            </p>
          </div>

          {/* Test connection output */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{testResult.message}</div>
            </div>
          )}

          {/* Schema notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Database schema with <code className="font-mono font-bold">orders</code>, <code className="font-mono font-bold">memberships</code>, and <code className="font-mono font-bold">staff_services</code> tables has been prepared in <span className="font-bold">supabase_schema.sql</span>.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !url || !anonKey}
              className="py-2.5 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Test Connection</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-3 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{isSaving ? 'Saving...' : 'Save & Connect Cloud'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
