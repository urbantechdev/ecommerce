import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Customer } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Users, Plus, Search, Building2, Phone, Mail, X } from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { notify } = useNotification();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customerType, setCustomerType] = useState<any>('SCHOOL');
  const [schoolOrOrg, setSchoolOrOrg] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [creditLimit, setCreditLimit] = useState(100000);

  const fetchCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCustomer({
        name,
        email,
        phone,
        customerType,
        schoolOrOrg,
        kraPin,
        creditLimit,
      });

      notify({ type: 'SUCCESS', title: 'Customer Created', message: `${name} profile saved.` });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      fetchCustomers();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Creation Failed', message: err.message });
    }
  };

  const filtered = customers.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.schoolOrOrg && c.schoolOrOrg.toLowerCase().includes(q)) ||
        c.phone.includes(q) ||
        (c.kraPin && c.kraPin.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            School & Customer Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Partner schools, institutional accounts, parent directories, and outstanding ledger balances.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
          <span>Add Customer / School</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search school, parent name, KRA PIN..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {c.customerType}
                </span>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                  {c.kraPin ? `PIN: ${c.kraPin}` : 'No PIN'}
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 mt-1">{c.name}</h3>
              {c.schoolOrOrg && (
                <p className="text-xs text-[#030A91] font-semibold mt-0.5">{c.schoolOrOrg}</p>
              )}

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{c.phone}</span>
                </div>
                {c.email && (
                  <div className="flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{c.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Current Balance:</span>
                <span
                  className={`font-black ${
                    c.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  KES {c.currentBalance.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Credit Limit:</span>
                <span className="font-semibold text-slate-700">
                  KES {c.creditLimit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add Customer Profile</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Customer / School Name:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Customer Type:
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="SCHOOL">School Account</option>
                    <option value="INDIVIDUAL">Parent / Student</option>
                    <option value="WHOLESALE">Wholesale Merchant</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Phone Number:
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 7..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Email:
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    KRA PIN:
                  </label>
                  <input
                    type="text"
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                    placeholder="P05..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Credit Limit (KES):
                </label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
