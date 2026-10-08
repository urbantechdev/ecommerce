import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Layers,
  ArrowLeftRight,
  FileSpreadsheet,
  Receipt,
  Users,
  Building2,
  Truck,
  TrendingDown,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Store,
  Tag,
  CreditCard,
  FileCheck,
  UserCheck
} from 'lucide-react';
import { api } from '../api';

interface LayoutProps {
  currentView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  highlight?: boolean;
  badge?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  const { user, branches, activeBranchId, activeBranchName, switchBranch, logout, canAccessAdmin, canAccessFinancials, isStaff } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const alerts = await api.getInventoryAlerts();
        setLowStockCount(alerts.length);
      } catch (err) {
        // quiet error
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 45000);
    return () => clearInterval(interval);
  }, []);

  const navGroups: NavGroup[] = [
    {
      group: 'Retail & POS',
      items: [
        { id: 'pos', label: 'POS Terminal', icon: ShoppingCart, highlight: true },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'receipts', label: 'Sales Receipts', icon: Receipt },
      ],
    },
    {
      group: 'Uniforms & Stock',
      items: [
        { id: 'inventory', label: 'Branch Inventory', icon: Layers, badge: lowStockCount > 0 ? lowStockCount : undefined },
        { id: 'products', label: 'Uniform Catalog', icon: Tag },
        { id: 'transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
      ],
    },
    {
      group: 'Billing & Accounts',
      items: [
        { id: 'invoices', label: 'Invoices', icon: FileSpreadsheet },
        { id: 'quotations', label: 'Quotations', icon: FileCheck },
        { id: 'customers', label: 'Customers & Schools', icon: Users },
      ],
    },
    ...(canAccessFinancials
      ? [
          {
            group: 'Purchases & Finance',
            items: [
              { id: 'suppliers', label: 'Suppliers', icon: Truck },
              { id: 'purchases', label: 'Purchase Orders', icon: CreditCard },
              { id: 'expenses', label: 'Expense Ledger', icon: TrendingDown },
              { id: 'financials', label: 'Financial Reports', icon: BarChart3 },
              { id: 'kra', label: 'KRA eTIMS Center', icon: ShieldCheck },
            ],
          },
        ]
      : []),
    ...(canAccessAdmin
      ? [
          {
            group: 'Administration',
            items: [
              { id: 'users', label: 'Staff & Roles', icon: UserCheck },
              { id: 'audit', label: 'Audit Trail', icon: History },
              { id: 'settings', label: 'System Settings', icon: Settings },
            ],
          },
        ]
      : []),
  ];

  const handleSelectNav = (viewId: string) => {
    onNavigate(viewId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col text-slate-800">
      {/* ==================================================== */}
      {/* FULL-WIDTH TOP HEADER BAR (PASSES ABOVE SIDEBAR)    */}
      {/* ==================================================== */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0412B3] text-white shadow-md w-full">
        <div className="h-16 px-3.5 sm:px-4 md:px-8 flex items-center justify-between">
          {/* Left: Brand Identity & Active Branch */}
          <div className="flex items-center space-x-2.5 sm:space-x-4">
            {/* Brand Logo & Name */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer select-none"
              onClick={() => handleSelectNav('dashboard')}
            >
              <img
                src="https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png"
                alt="Naisia Textiles"
                className="w-10 h-10 object-contain shrink-0 drop-shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <div className="leading-none">
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-black text-sm sm:text-base tracking-tight text-white drop-shadow-xs">
                    NAISIAE ERP
                  </h1>
                  <span className="md:hidden text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/15 text-[#FACB00]">
                    {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'ACCOUNTANT' ? 'Accounts' : 'Staff'}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-[#FACB00] font-bold tracking-widest uppercase mt-0.5">
                  TEXTILES & UNIFORMS
                </p>
              </div>
            </div>

            {/* Vertical Divider (Desktop) */}
            <div className="hidden lg:block h-6 w-[1px] bg-white/20 mx-1"></div>

            {/* Active Branch Indicator & Selector (Desktop) */}
            <div className="hidden sm:block relative">
              <button
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                disabled={isStaff}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                  isStaff
                    ? 'bg-white/10 border-white/15 text-white/85 cursor-default'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-xs backdrop-blur-xs'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-[#FACB00]" />
                <span className="truncate max-w-[180px]">{activeBranchName}</span>
                {!isStaff && <ChevronDown className="w-3.5 h-3.5 text-white/70" />}
              </button>

              {/* Branch Selector Dropdown */}
              {branchDropdownOpen && !isStaff && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">
                    Switch Branch Context
                  </div>
                  <button
                    onClick={() => {
                      switchBranch('all');
                      setBranchDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      activeBranchId === 'all' ? 'font-bold text-[#030A91] bg-blue-50' : 'text-slate-700'
                    }`}
                  >
                    <span>Consolidated (All Branches)</span>
                    {activeBranchId === 'all' && <span className="text-[#030A91]">✓</span>}
                  </button>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setBranchDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                        activeBranchId === b.id ? 'font-bold text-[#030A91] bg-blue-50' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      {activeBranchId === b.id && <span className="text-[#030A91]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tax Compliance badge */}
            <div className="hidden xl:flex items-center space-x-1.5 text-xs text-blue-200 font-medium pl-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Tax Compliant • KRA eTIMS Online</span>
            </div>
          </div>

          {/* Right Header Controls: On mobile, ONLY the hamburger menu is displayed. All other buttons are inside the hamburger drawer. On desktop, full toolbar is shown. */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick POS action button (Desktop only) */}
            <button
              onClick={() => onNavigate('pos')}
              className="hidden md:inline-flex items-center px-3.5 py-1.5 rounded-xl bg-[#FACB00] text-[#030A91] text-xs font-black hover:bg-yellow-400 transition-colors shadow-sm"
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5 text-[#030A91]" />
              <span>Launch POS</span>
            </button>

            {/* Low stock alerts pill (Desktop only) */}
            <button
              onClick={() => onNavigate('inventory')}
              className="hidden md:flex relative p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Low Stock Alerts"
            >
              <Bell className="w-4 h-4 text-white" />
              {lowStockCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-blue-900 animate-pulse"></span>
              )}
            </button>

            {/* User display (Desktop only) */}
            <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-white/20">
              <div className="w-8 h-8 rounded-full bg-[#FACB00] text-[#030A91] flex items-center justify-center font-black text-xs shadow-xs">
                {user?.name.charAt(0)}
              </div>
              <div className="text-left text-xs leading-none">
                <span className="font-bold text-white block truncate max-w-[120px]">
                  {user?.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-[#FACB00] font-bold uppercase mt-0.5 block">{user?.role}</span>
              </div>
            </div>

            {/* Desktop Direct Logout Button */}
            <button
              onClick={logout}
              title="Logout session"
              className="hidden md:block p-1.5 rounded-xl text-white/70 hover:text-rose-300 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* MOBILE ONLY: Pristine Hamburger Menu Button (Native Mobile App Style) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex md:hidden items-center justify-center p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-[#FACB00] transition-all border border-white/15 shadow-sm"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-[#FACB00]" />
            </button>
          </div>
        </div>

        {/* SINGLE WAVE CURVED BOTTOM EDGE (Spans 100% full width across entire screen) */}
        <div className="w-full leading-none overflow-hidden select-none -mb-[1px]">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-5 sm:h-7 md:h-9 block"
            preserveAspectRatio="none"
          >
            {/* Subtle Golden Accent Wave shadow behind */}
            <path
              d="M0,20 C360,95 1080,-10 1440,65 L1440,120 L0,120 Z"
              fill="#FACB00"
              fillOpacity="0.22"
            />
            {/* Primary Background wave cut */}
            <path
              d="M0,0 C380,85 1060,-20 1440,50 L1440,120 L0,120 Z"
              fill="#F4F4F4"
            />
          </svg>
        </div>
      </header>

      {/* ==================================================== */}
      {/* WORKSPACE: SIDEBAR & MAIN BODY (BELOW THE HEADER)    */}
      {/* ==================================================== */}
      <div className="flex-1 flex min-w-0">
        {/* ==================================================== */}
        {/* DESKTOP SIDEBAR (PASSES BELOW HEADER BAR)            */}
        {/* ==================================================== */}
        <aside className="hidden md:flex flex-col w-64 bg-white text-slate-700 shrink-0 border-r border-slate-200/90 z-20 select-none sticky top-20 sm:top-24 h-[calc(100vh-5.5rem)] shadow-2xs">
          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.group}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectNav(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                        isActive
                          ? 'bg-[#030A91] text-[#FACB00] shadow-md font-bold'
                          : item.highlight
                          ? 'bg-blue-50 text-[#030A91] hover:bg-blue-100 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-[#FACB00]' : 'text-slate-400 group-hover:text-[#030A91]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Active Station Card & User Info */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/80">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">Station Context</p>
                <p className="text-xs font-bold text-slate-800 truncate">{activeBranchName}</p>
              </div>
              <button
                onClick={logout}
                title="Logout session"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Primary Page Body */}
        <main
          className={`flex-1 min-w-0 p-3 sm:p-4 md:p-6 lg:p-8 ${
            currentView === 'pos' ? 'max-w-[1600px]' : 'max-w-7xl'
          } mx-auto -mt-1 sm:-mt-2 pb-24 md:pb-12`}
        >
          {children}
        </main>
      </div>

      {/* ==================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (NATIVE APP STYLE)      */}
      {/* ==================================================== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none">
        <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
          {/* 1. Dashboard / Home */}
          <button
            onClick={() => handleSelectNav('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              currentView === 'dashboard'
                ? 'text-[#030A91] font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <LayoutDashboard
                className={`w-5 h-5 transition-transform ${
                  currentView === 'dashboard' ? 'scale-110 text-[#030A91]' : 'text-slate-500'
                }`}
              />
              {currentView === 'dashboard' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#030A91]" />
              )}
            </div>
            <span className={`text-[10px] mt-1 tracking-tight ${currentView === 'dashboard' ? 'font-black text-[#030A91]' : 'font-medium'}`}>
              Home
            </span>
          </button>

          {/* 2. Inventory / Stock */}
          <button
            onClick={() => handleSelectNav('inventory')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              currentView === 'inventory'
                ? 'text-[#030A91] font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Layers
                className={`w-5 h-5 transition-transform ${
                  currentView === 'inventory' ? 'scale-110 text-[#030A91]' : 'text-slate-500'
                }`}
              />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[8.5px] font-black bg-rose-500 text-white animate-pulse">
                  {lowStockCount}
                </span>
              )}
              {currentView === 'inventory' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#030A91]" />
              )}
            </div>
            <span className={`text-[10px] mt-1 tracking-tight ${currentView === 'inventory' ? 'font-black text-[#030A91]' : 'font-medium'}`}>
              Stock
            </span>
          </button>

          {/* 3. POS Terminal (Elevated Center Button) */}
          <button
            onClick={() => handleSelectNav('pos')}
            className="flex flex-col items-center justify-center -mt-4 group active:scale-95 transition-transform"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                currentView === 'pos'
                  ? 'bg-gradient-to-tr from-[#02066F] to-[#0412B3] text-[#FACB00] ring-4 ring-[#FACB00]/40 scale-105'
                  : 'bg-gradient-to-tr from-[#02066F] to-[#030A91] text-[#FACB00] ring-4 ring-white shadow-blue-900/30'
              }`}
            >
              <ShoppingCart className="w-5 h-5 text-[#FACB00]" />
            </div>
            <span
              className={`text-[10px] mt-1 tracking-tight ${
                currentView === 'pos' ? 'font-black text-[#030A91]' : 'font-bold text-slate-700'
              }`}
            >
              POS
            </span>
          </button>

          {/* 4. Sales Receipts */}
          <button
            onClick={() => handleSelectNav('receipts')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              currentView === 'receipts'
                ? 'text-[#030A91] font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Receipt
                className={`w-5 h-5 transition-transform ${
                  currentView === 'receipts' ? 'scale-110 text-[#030A91]' : 'text-slate-500'
                }`}
              />
              {currentView === 'receipts' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#030A91]" />
              )}
            </div>
            <span className={`text-[10px] mt-1 tracking-tight ${currentView === 'receipts' ? 'font-black text-[#030A91]' : 'font-medium'}`}>
              Receipts
            </span>
          </button>

          {/* 5. Full Menu / More */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              !['dashboard', 'inventory', 'pos', 'receipts'].includes(currentView)
                ? 'text-[#030A91] font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Menu className="w-5 h-5 text-slate-500 group-hover:text-slate-800" />
              {!['dashboard', 'inventory', 'pos', 'receipts'].includes(currentView) && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#030A91]" />
              )}
            </div>
            <span
              className={`text-[10px] mt-1 tracking-tight ${
                !['dashboard', 'inventory', 'pos', 'receipts'].includes(currentView)
                  ? 'font-black text-[#030A91]'
                  : 'font-medium'
              }`}
            >
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* ==================================================== */}
      {/* MOBILE APP DRAWER (SLIDES IN FROM THE RIGHT)         */}
      {/* ==================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex justify-end md:hidden animate-in fade-in duration-200">
          {/* Overlay touch backdrop */}
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>

          {/* Right-Hand App Drawer */}
          <div className="w-[88vw] max-w-sm bg-gradient-to-b from-[#02066F] via-[#030A91] to-[#010340] text-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 select-none">
            {/* Drawer App Bar Header */}
            <div className="p-4 bg-black/20 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <img
                  src="https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png"
                  alt="Naisia Textiles"
                  className="w-9 h-9 object-contain shrink-0 drop-shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.png';
                  }}
                />
                <div>
                  <h3 className="font-black text-sm text-white tracking-tight leading-none">
                    NAISIAE ERP
                  </h3>
                  <span className="text-[9px] text-[#FACB00] font-bold uppercase tracking-wider block mt-0.5">
                    Mobile Control Menu
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile User Profile Card */}
            <div className="p-4 bg-white/5 border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FACB00] text-[#030A91] flex items-center justify-center font-black text-lg shadow-md ring-2 ring-white/20 shrink-0">
                  {user?.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-white truncate">
                    {user?.name}
                  </h4>
                  <p className="text-[10px] text-blue-200 truncate">{user?.email}</p>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FACB00] text-[#030A91]">
                      {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'ACCOUNTANT' ? 'Chief Accountant' : 'POS Cashier'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Branch Context Switcher */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] text-blue-200 mb-1">
                  <span className="font-bold uppercase tracking-wider flex items-center">
                    <Store className="w-3 h-3 mr-1 text-[#FACB00]" />
                    Station Context:
                  </span>
                  <span className="text-[#FACB00] font-mono text-[10px] truncate max-w-[130px]">{activeBranchName}</span>
                </div>
                <select
                  value={activeBranchId}
                  disabled={isStaff}
                  onChange={(e) => switchBranch(e.target.value)}
                  className="w-full bg-black/30 border border-white/20 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#FACB00]"
                >
                  <option value="all" className="bg-[#030A91] text-white">Consolidated (All Branches)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#030A91] text-white">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Quick Action Buttons Inside Drawer */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => handleSelectNav('pos')}
                  className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-[#FACB00] text-[#030A91] text-xs font-black shadow-sm active:scale-95 transition-transform"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Launch POS</span>
                </button>

                <button
                  onClick={() => handleSelectNav('inventory')}
                  className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-white/15 text-white text-xs font-bold hover:bg-white/20 active:scale-95 transition-transform relative"
                >
                  <Bell className="w-3.5 h-3.5 text-[#FACB00]" />
                  <span>Alerts</span>
                  {lowStockCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white">
                      {lowStockCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Well-Organized Grouped Navigation Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
              {navGroups.map((group, idx) => (
                <div key={idx} className="bg-white/5 rounded-2xl p-2.5 border border-white/10 space-y-1">
                  <p className="px-2 pt-1 pb-1.5 text-[10px] font-black text-[#FACB00] uppercase tracking-wider flex items-center justify-between">
                    <span>{group.group}</span>
                    <span className="text-[9px] font-mono opacity-60">{group.items.length} items</span>
                  </p>

                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectNav(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-[#FACB00] text-[#030A91] shadow-md scale-[1.01]'
                              : 'text-white/90 hover:bg-white/10 active:bg-white/15'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#030A91]' : 'text-blue-200'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Drawer Bottom Actions */}
            <div className="p-3 bg-black/30 border-t border-white/10 space-y-2 shrink-0">
              <div className="flex items-center justify-between px-1 text-[10px] text-blue-200 font-medium">
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                  KRA eTIMS Active
                </span>
                <span className="font-mono text-slate-400">v2.6 Cloud</span>
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-bold active:scale-98 transition-all"
              >
                <LogOut className="w-4 h-4 text-rose-300" />
                <span>Sign Out of ERP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
