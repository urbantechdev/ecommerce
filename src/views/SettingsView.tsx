import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { SystemSettings } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Settings, Save, Mail, Download, ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { notify } = useNotification();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (err: any) {
        notify({ type: 'ERROR', title: 'Error', message: err.message });
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await api.updateSettings(settings);
      notify({
        type: 'SUCCESS',
        title: 'Settings Saved',
        message: 'Enterprise configuration and tax settings successfully updated.',
      });
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      await api.testEmail(testEmailTo.trim() || undefined);
      notify({
        type: 'SUCCESS',
        title: 'Test Email Dispatched',
        message: `Notification sent from support@naisiaetextiles.com to ${testEmailTo || settings?.companyEmail}`,
      });
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Test Failed', message: err.message });
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          Enterprise Company Settings & Compliance
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure branding, tax parameters, sequential document numbering, and Zoho/Cloudflare email integration.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-[#030A91]" />
            <h3 className="font-bold text-sm text-slate-900">Company Identity & Contact</h3>
          </div>

          {/* Company Brand Logo */}
          <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <img
              src={settings.logoUrl || 'https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png'}
              alt="Brand Logo"
              className="w-14 h-14 object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Official Logo Image URL:
              </label>
              <input
                type="url"
                value={settings.logoUrl || ''}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                placeholder="https://.../logo.png"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Displayed on Top Header, Mobile Navigation, Invoices, Quotations, and POS Thermal Receipts.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Company Legal Name:
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Official Domain:
              </label>
              <input
                type="text"
                value={settings.companyDomain}
                onChange={(e) => setSettings({ ...settings, companyDomain: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Support & Dispatch Email:
              </label>
              <input
                type="email"
                value={settings.companyEmail}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Headquarters Phone:
              </label>
              <input
                type="text"
                value={settings.companyPhone}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Headquarters Physical Address:
              </label>
              <input
                type="text"
                value={settings.companyAddress}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                required
              />
            </div>
          </div>
        </div>

        {/* Kenya Tax & KRA eTIMS Parameters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">Kenya Tax & eTIMS Parameters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Trader KRA PIN:
              </label>
              <input
                type="text"
                value={settings.kraPin}
                onChange={(e) => setSettings({ ...settings, kraPin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl uppercase font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Trader System Code:
              </label>
              <input
                type="text"
                value={settings.kraTraderCode}
                onChange={(e) => setSettings({ ...settings, kraTraderCode: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                OSCU Serial Number:
              </label>
              <input
                type="text"
                value={settings.kraOscuSerial}
                onChange={(e) => setSettings({ ...settings, kraOscuSerial: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* Document Numbering Prefixes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100">
            Document Numbering Sequences
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Invoice Prefix:
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Receipt Prefix:
              </label>
              <input
                type="text"
                value={settings.receiptPrefix}
                onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Quotation Prefix:
              </label>
              <input
                type="text"
                value={settings.quotationPrefix}
                onChange={(e) => setSettings({ ...settings, quotationPrefix: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                PO Prefix:
              </label>
              <input
                type="text"
                value={settings.poPrefix}
                onChange={(e) => setSettings({ ...settings, poPrefix: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
              Thermal Receipt Policy / Disclaimer Message:
            </label>
            <textarea
              value={settings.receiptFooterMessage}
              onChange={(e) => setSettings({ ...settings, receiptFooterMessage: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              rows={2}
            />
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2.5 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2 text-[#FACB00]" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Email Integration Test & Database Backup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
        {/* Email Testing Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-[#030A91]" />
            <h3 className="font-bold text-sm text-slate-900">Email Infrastructure Verification</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Verify automated dispatch of invoices and receipts from{' '}
            <strong className="text-slate-800">support@naisiaetextiles.com</strong> via Zoho & Cloudflare SMTP.
          </p>

          <div className="flex gap-2">
            <input
              type="email"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
            />
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={isTestingEmail}
              className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 disabled:opacity-50"
            >
              {isTestingEmail ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>

        {/* Database Backup Export */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">Database Snapshot & Backups</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Export a full, atomic JSON snapshot of all products, stock levels, sales, audit logs, and institutional accounts.
          </p>

          <a
            href="/api/backup/export"
            download
            className="inline-flex items-center px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Download Database Snapshot</span>
          </a>
        </div>
      </div>
    </div>
  );
};
