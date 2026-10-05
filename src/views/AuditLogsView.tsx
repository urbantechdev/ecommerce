import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AuditLog } from '../types';
import { useNotification } from '../context/NotificationContext';
import { History, Search, ShieldAlert, Filter, Clock } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { notify } = useNotification();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs({
        action: searchQuery.trim() || undefined,
        entityType: selectedEntity !== 'ALL' ? selectedEntity : undefined,
      });
      setLogs(data);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedEntity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            System Security & Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of privilege escalations, logins, stock movements, invoices voided, and financial transactions.
          </p>
        </div>
      </div>

      {/* Filter Header */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action or keyword..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
          />
        </div>

        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
        >
          <option value="ALL">All Entity Types</option>
          <option value="AUTH">Authentication / Logins</option>
          <option value="SALE">Sales & POS</option>
          <option value="INVENTORY">Inventory Adjustments</option>
          <option value="INVOICE">Invoices & Voids</option>
          <option value="PURCHASE">Purchase Orders & GRN</option>
          <option value="TRANSFER">Stock Transfers</option>
          <option value="SECURITY">Security & Access Control</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900"
        >
          Search
        </button>
      </form>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">User & Role</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{log.userName}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500">{log.userRole}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                    {log.branchName}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        log.action.includes('DENIED') || log.action.includes('FAILED')
                          ? 'bg-rose-100 text-rose-800 font-black'
                          : log.action.includes('VOID')
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 leading-relaxed max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit records match the criteria.
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
