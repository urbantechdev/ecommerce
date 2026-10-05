import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { DashboardMetrics } from '../types';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Receipt,
  Building,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Layers,
  ShoppingCart
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { activeBranchId, activeBranchName, canAccessFinancials, user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDashboardMetrics(activeBranchId);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeBranchId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#030A91] to-blue-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#FACB00] tracking-wider uppercase">
            Active Context: {activeBranchName}
          </span>
          <h2 className="text-xl md:text-2xl font-black tracking-tight mt-0.5">
            Operational Executive Overview
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Real-time synchronization across retail outlets, uniform inventory, KRA eTIMS fiscal logs, and financial records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2 bg-[#FACB00] text-[#030A91] rounded-xl text-xs font-black hover:bg-yellow-400 transition-colors shadow-sm flex items-center space-x-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Launch POS Terminal</span>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="px-4 py-2 bg-blue-800 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center space-x-1.5 border border-blue-700"
          >
            <Layers className="w-4 h-4" />
            <span>Check Stock</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              KES {metrics?.todaySales.toLocaleString() || '0'}
            </h3>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              Live POS transactions
            </span>
          </div>
        </div>

        {/* Total Stock Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Inventory Value (Cost)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#030A91] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              KES {metrics?.totalInventoryValuationCost.toLocaleString() || '0'}
            </h3>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Retail Value: KES {metrics?.totalInventoryValuationRetail.toLocaleString() || '0'}
            </span>
          </div>
        </div>

        {/* Gross Profit / Financials */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {canAccessFinancials ? 'Gross Profit' : 'Total Revenue'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              KES{' '}
              {canAccessFinancials
                ? metrics?.grossProfit.toLocaleString() || '0'
                : metrics?.totalSalesRevenue.toLocaleString() || '0'}
            </h3>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {canAccessFinancials
                ? `Net Profit: KES ${metrics?.netProfit.toLocaleString() || '0'}`
                : 'All completed sales'}
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Low Stock Items
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-rose-600 tracking-tight">
              {metrics?.lowStockCount || 0} SKU Variants
            </h3>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-[11px] text-[#030A91] hover:underline font-bold mt-1 inline-flex items-center"
            >
              Review reorder alerts &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Branch Comparison & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Branch Sales Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center">
              <Building className="w-4 h-4 mr-2 text-[#030A91]" />
              Branch Revenue Share
            </h3>
            <span className="text-[11px] text-slate-500">Live Sync</span>
          </div>

          <div className="space-y-4">
            {metrics?.branchPerformance.map((b) => {
              const maxSales = Math.max(...metrics.branchPerformance.map((p) => p.totalSales), 1);
              const percentage = Math.round((b.totalSales / maxSales) * 100);
              return (
                <div key={b.branchId} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 truncate pr-2">{b.branchName}</span>
                    <span className="font-bold text-slate-900 shrink-0">
                      KES {b.totalSales.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#030A91] rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* KRA eTIMS Fiscal Status Card */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-slate-800">KRA eTIMS OSCU Integration</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                PIN: P051839281Z • Fiscal receipts transmitted with QR verification.
              </p>
              {metrics?.pendingRetryKraCount ? (
                <span className="text-rose-600 font-bold block mt-1">
                  {metrics.pendingRetryKraCount} pending retry queued
                </span>
              ) : (
                <span className="text-emerald-700 font-bold block mt-1">
                  All transactions fiscalized 100%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Sales Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center">
              <Receipt className="w-4 h-4 mr-2 text-[#030A91]" />
              Recent POS & Store Sales
            </h3>
            <button
              onClick={() => onNavigate('receipts')}
              className="text-xs font-bold text-[#030A91] hover:underline"
            >
              View all sales &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                  <th className="pb-3">Receipt #</th>
                  <th className="pb-3">Branch</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">eTIMS Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics?.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">{sale.receiptNumber}</td>
                    <td className="py-3 text-slate-600 truncate max-w-[130px]">{sale.branchName}</td>
                    <td className="py-3 text-slate-600 truncate max-w-[130px]">{sale.customerName}</td>
                    <td className="py-3 font-semibold text-slate-700 uppercase">{sale.paymentMethod}</td>
                    <td className="py-3 font-black text-slate-900">
                      KES {sale.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={sale.kraStatus} type="kra" />
                    </td>
                  </tr>
                ))}
                {(!metrics?.recentSales || metrics.recentSales.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No transactions recorded yet today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
