import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Supplier } from '../types';
import { useNotification } from '../context/NotificationContext';
import { Truck, Plus, Search, Building2, Phone, Mail, X } from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const { notify } = useNotification();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [category, setCategory] = useState<any>('FABRIC');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');

  const fetchSuppliers = async () => {
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSupplier({
        name,
        companyName,
        contactPerson,
        phone,
        email,
        address,
        kraPin,
        category,
        paymentTerms,
      });

      notify({ type: 'SUCCESS', title: 'Supplier Added', message: `${companyName || name} profile created.` });
      setIsModalOpen(false);
      setName('');
      setCompanyName('');
      setPhone('');
      fetchSuppliers();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error', message: err.message });
    }
  };

  const filtered = suppliers.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Fabric & Textile Suppliers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Durable school uniform millers, embroidery artisans, knitwear manufacturers, and accounts payable.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
          <span>Add New Supplier</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search supplier, miller, KRA PIN..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {s.category}
                </span>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                  {s.kraPin || 'KRA PIN N/A'}
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 mt-1">{s.companyName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Contact: {s.contactPerson}</p>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{s.phone}</span>
                </div>
                {s.email && (
                  <div className="flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{s.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Payable Balance:</span>
                <span className="font-black text-slate-900">
                  KES {s.currentBalance.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Terms:</span>
                <span className="font-semibold text-slate-700">{s.paymentTerms}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Textile Supplier</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Company / Mill Name:
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (!name) setName(e.target.value);
                  }}
                  placeholder="e.g. Rivatex East Africa Ltd"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Contact Person:
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Category:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="FABRIC">Fabric / Shirting</option>
                    <option value="KNITWEAR">Sweaters & Knitwear</option>
                    <option value="ACCESSORIES">Ties & Badges</option>
                    <option value="EMBROIDERY">Custom Monograms</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Phone:
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                    required
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
                  Physical Address / Town:
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Eldoret Industrial Area"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
