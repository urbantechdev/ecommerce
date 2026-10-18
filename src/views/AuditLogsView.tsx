import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AuditLog } from '../types';
import { useNotification } from '../context/NotificationContext';
import { History, Search, ShieldAlert, Filter, Clock, Download, User as UserIcon } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { notify } = useNotification();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Extract unique users from loaded logs for the filter dropdown
  const uniqueUsers = Array.from(new Set(logs.map(l => l.userId))).map(userId => {
    const log = logs.find(l => l.userId === userId);
    return { userId, userName: log ? log.userName : userId, userRole: log ? log.userRole : '' };
  });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs({
        action: searchQuery.trim() || undefined,
        entityType: selectedEntity !== 'ALL' ? selectedEntity : undefined,
        userId: selectedUser !== 'ALL' ? selectedUser : undefined,
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
  }, [selectedEntity, selectedUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleDownloadCsv = () => {
    if (logs.length === 0) {
      notify({ type: 'ERROR', title: 'Export Failed', message: 'No audit logs available to export.' });
      return;
    }
    const headers = ['Timestamp (UTC)', 'User ID', 'User Name', 'Role', 'Branch', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address'];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.userId}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.branchName}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.entityId}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.ipAddress || 'N/A'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `user_audit_trail_${selectedUser === 'ALL' ? 'all_users' : selectedUser}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify({ type: 'SUCCESS', title: 'Download Complete', message: 'Detailed user audit trail successfully downloaded as CSV.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            System Security & Detailed Second-by-Second User Audit
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            High-granularity audit trail tracking every action down to the second, with per-user filtering and CSV export.
          </p>
        </div>
        <button
          onClick={handleDownloadCsv}
          disabled={logs.length === 0}
          className="inline-flex items-center px-4 py-2.5 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 shadow-md transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4 mr-2 text-[#FACB00]" />
          <span>Download User Audit Data (CSV)</span>
        </button>
      </div>

      {/* Filter Header */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action keyword or detail..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
          />
        </div>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
        >
          <option value="ALL">All Users ({uniqueUsers.length})</option>
          {uniqueUsers.map(u => (
            <option key={u.userId} value={u.userId}>{u.userName} ({u.userRole})</option>
          ))}
        </select>
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
          <option value="USER_ACTION">User Navigation & Actions</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900"
        >
          Filter
        </button>
      </form>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="py-3 px-4">Timestamp (UTC / Second)</th>
                <th className="py-3 px-3">User & Role</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-4">Granular Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                    {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{log.userName}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500">{log.userRole} • ID: {log.userId}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                    {log.branchName}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        log.action.includes('DENIED') || log.action.includes('FAILED')
                          ? 'bg-rose-100 text-rose-800 font-black'
                          : log.action.includes('VOID') || log.action.includes('DELETE')
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
                    No audit records match the selected user or filter criteria.
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
