import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { SystemSettings } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Settings, Save, Mail, Download, ShieldCheck, Building2, CheckCircle2, Bell } from 'lucide-react';

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

  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [isBroadcastingPush, setIsBroadcastingPush] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setIsPushSubscribed(true);
        });
      });
    }
  }, []);

  const handleSubscribePush = async () => {
    setIsSubscribingPush(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported by this browser.');
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const { publicKey } = await api.getVapidPublicKey();
      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray,
      });

      await api.subscribePush(subscription);
      setIsPushSubscribed(true);
      notify({ type: 'SUCCESS', title: 'Push Enabled', message: 'Successfully subscribed to VAPID push notifications.' });
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Push Subscription Failed', message: err.message || 'Could not enable push.' });
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleBroadcastPush = async () => {
    setIsBroadcastingPush(true);
    try {
      const res = await api.broadcastPush({
        title: 'Naisia Textiles Enterprise Alert',
        body: 'Test broadcast notification sent successfully from ERP admin panel!',
        url: '/erp',
      });
      notify({ type: 'SUCCESS', title: 'Broadcast Sent', message: `Push notification delivered to ${res.sentCount} active subscribers.` });
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Broadcast Failed', message: err.message });
    } finally {
      setIsBroadcastingPush(false);
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

        {/* Email & Zoho Outbound Dispatch Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-[#030A91]" />
              <h3 className="font-bold text-sm text-slate-900">
                Email Dispatch Configuration (Zoho SMTP)
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#030A91] border border-blue-200">
              Outbound Sending
            </span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 flex-1">
              <div className="flex items-center justify-between">
                <strong className="font-bold text-emerald-900">Configured via Secrets (Recommended)</strong>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${settings.isSmtpConfigured ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-800'}`}>
                  {settings.isSmtpConfigured ? '✓ Secret Active (Live SMTP)' : 'Pending Secret Configuration'}
                </span>
              </div>
              <p className="mt-1 text-emerald-800 leading-relaxed text-[11px]">
                You can set your Zoho App Password in the platform&apos;s <strong>Secrets</strong> panel as <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold text-emerald-950">SMTP_PASS</code>. The server automatically injects it at runtime without exposing credentials in the browser.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                SMTP Server Host:
              </label>
              <input
                type="text"
                value={settings.smtpHost || 'smtp.zoho.com'}
                onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                placeholder="smtp.zoho.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Env Var: <code className="font-mono">SMTP_HOST</code> (Default: smtp.zoho.com)</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                SMTP Port & Security:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={settings.smtpPort || 465}
                  onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                  placeholder="465"
                  className="w-28 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                />
                <select
                  value={settings.smtpSecure ? 'ssl' : 'tls'}
                  onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.value === 'ssl' })}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="ssl">SSL (Port 465 - Zoho Default)</option>
                  <option value="tls">STARTTLS (Port 587)</option>
                </select>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Env Var: <code className="font-mono">SMTP_PORT</code></span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Zoho Sender / Username:
              </label>
              <input
                type="email"
                value={settings.smtpUser || settings.companyEmail || 'support@naisiaetextiles.com'}
                onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                placeholder="support@naisiaetextiles.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Env Var: <code className="font-mono">SMTP_USER</code></span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Zoho App Password / Secret Override:
              </label>
              <input
                type="password"
                value={settings.smtpPassword || ''}
                onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                placeholder={settings.isSmtpConfigured ? 'Configured via SMTP_PASS secret' : 'Paste Zoho App Password (or set SMTP_PASS secret)'}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Env Var: <code className="font-mono font-bold text-slate-700">SMTP_PASS</code> (Generated in accounts.zoho.com &rarr; Security &rarr; App Passwords)
              </span>
            </div>
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

      {/* Email Integration Test, Push Notifications & Database Backup */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
        {/* Email Testing Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-[#030A91]" />
              <h3 className="font-bold text-sm text-slate-900">Email Infrastructure</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Verify automated dispatch of invoices and receipts from <strong className="text-slate-800">support@naisiaetextiles.com</strong> via Zoho SMTP.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
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
              className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 disabled:opacity-50 shrink-0"
            >
              {isTestingEmail ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>

        {/* VAPID Push Notifications Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-[#030A91]" />
              <h3 className="font-bold text-sm text-slate-900">VAPID Push Alerts</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Receive real-time order alerts and stock updates directly in your browser via service worker push notifications.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubscribePush}
              disabled={isSubscribingPush || isPushSubscribed}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                isPushSubscribed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                  : 'bg-[#030A91] text-white hover:bg-blue-900 shadow-sm'
              }`}
            >
              {isPushSubscribed ? '✓ Browser Push Enabled' : isSubscribingPush ? 'Enabling...' : 'Enable Push Notifications'}
            </button>

            {isPushSubscribed && (
              <button
                type="button"
                onClick={handleBroadcastPush}
                disabled={isBroadcastingPush}
                className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                {isBroadcastingPush ? 'Broadcasting...' : 'Broadcast Test Push'}
              </button>
            )}
          </div>
        </div>

        {/* Database Backup Export */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Database Backup</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              Export a full, atomic JSON snapshot of all products, stock levels, sales, and accounts.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="/api/backup/export"
              download
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Download Snapshot</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
