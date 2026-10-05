import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { BarChart3, Download, Calendar, DollarSign, ShieldCheck, Building, TrendingUp } from 'lucide-react';

export const FinancialReportsView: React.FC = () => {
  const { activeBranchId } = useAuth();
  const { notify } = useNotification();

  const [activeTab, setActiveTab] = useState<'PL' | 'VAT' | 'BRANCHES'>('PL');
  const [plData, setPlData] = useState<any>(null);
  const [vatData, setVatData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const [pl, vat, dash] = await Promise.all([
        api.getProfitLoss({ branchId: activeBranchId }),
        api.getVatReturn(),
        api.getDashboardMetrics(activeBranchId),
      ]);
      setPlData(pl);
      setVatData(vat);
      setDashboardData(dash);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeBranchId]);

  const handleExportCSV = () => {
    if (!plData) return;
    const rows = [
      ['Naisia Textiles ERP - Financial Report'],
      ['Generated On', new Date().toISOString()],
      [''],
      ['P&L SUMMARY'],
      ['Gross Revenue (KES)', plData.revenue],
      ['Cost of Goods Sold (KES)', plData.cogs],
      ['Gross Profit (KES)', plData.grossProfit],
      ['Total Operating Expenses (KES)', plData.totalExpenses],
      ['Net Profit (KES)', plData.netProfit],
      [''],
      ['KRA VAT RETURN (FORM VAT 3)'],
      ['KRA PIN', vatData?.kraPin],
      ['Standard Rated Sales 16% (KES)', vatData?.standardRatedSalesGross],
      ['Output Tax Collected (KES)', vatData?.outputVat],
      ['Input Tax Deductible (KES)', vatData?.inputVat],
      ['Net VAT Payable to KRA (KES)', vatData?.netVatPayable],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `naisiae-financial-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify({
      type: 'SUCCESS',
      title: 'Report Exported',
      message: 'Financial summary CSV downloaded successfully.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Financial Management & Tax Compliance Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audited financial statements, gross & net margins, and official KRA Form VAT 3 return calculations.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4 mr-1.5 text-[#FACB00]" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('PL')}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === 'PL'
              ? 'border-[#030A91] text-[#030A91]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Profit & Loss Statement
        </button>

        <button
          onClick={() => setActiveTab('VAT')}
          className={`py-2.5 px-4 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'VAT'
              ? 'border-[#030A91] text-[#030A91]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>KRA VAT 3 Tax Return</span>
        </button>

        <button
          onClick={() => setActiveTab('BRANCHES')}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === 'BRANCHES'
              ? 'border-[#030A91] text-[#030A91]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Branch Performance
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: PROFIT & LOSS                                 */}
      {/* ==================================================== */}
      {activeTab === 'PL' && plData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Revenue</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                KES {plData.revenue.toLocaleString()}
              </h3>
              <span className="text-[11px] text-slate-500">Gross sales realized</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Cost of Goods (COGS)</span>
              <h3 className="text-xl font-black text-slate-700 mt-1">
                KES {plData.cogs.toLocaleString()}
              </h3>
              <span className="text-[11px] text-slate-500">Fabric & tailoring cost</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Gross Profit</span>
              <h3 className="text-xl font-black text-blue-900 mt-1">
                KES {plData.grossProfit.toLocaleString()}
              </h3>
              <span className="text-[11px] text-emerald-600 font-bold">
                {plData.grossMargin}% Gross Margin
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Net Profit</span>
              <h3 className="text-xl font-black text-emerald-700 mt-1">
                KES {plData.netProfit.toLocaleString()}
              </h3>
              <span className="text-[11px] text-emerald-600 font-bold">
                {plData.netMargin}% Net Margin
              </span>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl">
            <h3 className="font-extrabold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Statement of Comprehensive Income
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="font-bold text-slate-800">1. Revenue from School Uniform Sales:</span>
                <span className="font-mono font-bold text-slate-900">KES {plData.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span className="pl-4">Less: Direct Cost of Goods Sold (Materials & Labor):</span>
                <span className="font-mono text-rose-600">-KES {plData.cogs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 bg-blue-50 px-3 rounded-lg font-bold text-[#030A91]">
                <span>GROSS PROFIT:</span>
                <span className="font-mono text-sm">KES {plData.grossProfit.toLocaleString()}</span>
              </div>

              <div className="pt-2 font-bold text-slate-800">2. Operating Expenses Breakdown:</div>
              {Object.entries(plData.expensesByCategory || {}).map(([cat, amt]: any) => (
                <div key={cat} className="flex justify-between pl-4 text-slate-600">
                  <span>{cat}:</span>
                  <span className="font-mono">-KES {Number(amt).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-t border-slate-100 font-semibold text-slate-700 pl-4">
                <span>Total Operating Overheads:</span>
                <span className="font-mono text-rose-600">-KES {plData.totalExpenses.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-3 bg-emerald-50 px-3 rounded-lg font-black text-emerald-950 text-sm border border-emerald-200">
                <span>NET OPERATING PROFIT:</span>
                <span className="font-mono">KES {plData.netProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: KRA VAT RETURN FORM VAT 3                    */}
      {/* ==================================================== */}
      {activeTab === 'VAT' && vatData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 mb-1">
                KRA ITax / eTIMS Validated
              </div>
              <h3 className="font-black text-base text-slate-900">
                Kenya Revenue Authority (KRA) Form VAT 3
              </h3>
              <p className="text-xs text-slate-500">Monthly Value Added Tax Return Computation</p>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-400 block">Registered Trader PIN:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{vatData.kraPin}</span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Output Tax */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Part A: Output VAT on Taxable Sales (16%)
              </h4>
              <div className="flex justify-between">
                <span className="text-slate-600">Standard Rated Sales (Gross Inc. VAT):</span>
                <span className="font-mono font-bold">KES {vatData.standardRatedSalesGross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Net Taxable Value (Excl. VAT):</span>
                <span className="font-mono">KES {vatData.standardRatedSalesTaxable.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                <span>Output Tax Collected (16% Standard):</span>
                <span className="font-mono text-blue-900">KES {vatData.outputVat.toLocaleString()}</span>
              </div>
            </div>

            {/* Input Tax */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Part B: Input VAT on Purchases & Raw Materials
              </h4>
              <div className="flex justify-between">
                <span className="text-slate-600">Approved Textile Mill Invoices (Net):</span>
                <span className="font-mono">KES {vatData.totalPurchasesTaxable.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                <span>Deductible Input VAT (16%):</span>
                <span className="font-mono text-emerald-700">KES {vatData.inputVat.toLocaleString()}</span>
              </div>
            </div>

            {/* Net Settlement */}
            <div className="p-5 bg-gradient-to-r from-blue-900 to-[#030A91] text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#FACB00] uppercase font-bold tracking-wider">
                  Net Tax Position for Tax Period {vatData.taxPeriod}
                </span>
                <h4 className="text-lg font-black mt-0.5">
                  {vatData.isRefundable ? 'VAT REFUND CLAIMABLE' : 'NET VAT PAYABLE TO KRA'}
                </h4>
                <p className="text-[11px] text-blue-200">
                  Due on or before 20th of succeeding month via KRA iTax Paybill 222222.
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-white font-mono">
                  KES {Math.abs(vatData.netVatPayable).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: BRANCH COMPARISON                             */}
      {/* ==================================================== */}
      {activeTab === 'BRANCHES' && dashboardData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-4">
          <h3 className="font-bold text-sm text-slate-800">Branch Revenue Benchmarking</h3>
          <div className="space-y-4">
            {dashboardData.branchPerformance?.map((b: any) => {
              const max = Math.max(...dashboardData.branchPerformance.map((bp: any) => bp.totalSales), 1);
              const pct = Math.round((b.totalSales / max) * 100);
              return (
                <div key={b.branchId} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-800">{b.branchName}</span>
                    <span className="font-mono font-bold text-[#030A91]">
                      KES {b.totalSales.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#030A91] rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
