import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { InventoryItem } from '../types';
import {
  Layers,
  Search,
  Filter,
  AlertTriangle,
  History,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  X,
  CheckCircle2,
  Image as ImageIcon,
  Database,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Minus,
  ArrowUpDown,
  Store,
  TrendingDown,
  Tag,
  Download,
  AlertCircle,
  Clock
} from 'lucide-react';
import { SkuImageManagerModal } from '../components/SkuImageManagerModal';
import { syncInventoryToFirestore } from '../utils/firestoreInventorySync';

type ViewMode = 'CARDS' | 'TABLE';
type StockStatusFilter = 'ALL' | 'LOW' | 'OUT' | 'HEALTHY';
type SortOption = 'DEFAULT' | 'STOCK_ASC' | 'STOCK_DESC' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC';

export const InventoryView: React.FC = () => {
  const { branches, activeBranchId, canAccessFinancials, user } = useAuth();
  const { notify } = useNotification();

  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'STOCK' | 'ALERTS' | 'MOVEMENTS'>('STOCK');
  // Default to CARDS on mobile viewports for a native mobile app feel
  const [viewMode, setViewMode] = useState<ViewMode>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'CARDS' : 'CARDS'));

  // Main Data States
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Customization
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(activeBranchId);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DEFAULT');

  // Quick Inline Adjustment Feedback
  const [quickAdjustingSku, setQuickAdjustingSku] = useState<string | null>(null);

  // Full Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('PHYSICAL_COUNT');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // SKU Image Files Modal
  const [isSkuImageModalOpen, setIsSkuImageModalOpen] = useState(false);
  const [selectedSkuForModal, setSelectedSkuForModal] = useState<string | undefined>(undefined);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // Database Sync State
  const [isSyncingDb, setIsSyncingDb] = useState(false);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const [invData, alertData, moveData] = await Promise.all([
        api.getInventory({ branchId: selectedBranchFilter }),
        api.getInventoryAlerts(),
        api.getInventoryMovements({ branchId: selectedBranchFilter }),
      ]);
      setInventory(invData);
      setAlerts(alertData);
      setMovements(moveData);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Error loading inventory', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedBranchFilter]);

  // Derived filter options
  const schools = useMemo(() => Array.from(new Set(inventory.map((i) => i.school))).filter(Boolean).sort(), [inventory]);
  const categories = useMemo(() => Array.from(new Set(inventory.map((i) => i.category))).filter(Boolean).sort(), [inventory]);

  // KPI Calculations
  const stats = useMemo(() => {
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockUnits = 0;
    let totalValuationCost = 0;
    let totalValuationRetail = 0;

    inventory.forEach((item) => {
      totalStockUnits += item.currentStock;
      totalValuationCost += item.totalValuationCost || item.currentStock * item.costPrice;
      totalValuationRetail += item.totalValuationRetail || item.currentStock * item.sellingPrice;

      if (item.currentStock === 0) {
        outOfStockCount++;
      } else if (item.isLow || item.currentStock <= item.reorderLevel) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    });

    return {
      totalSkus: inventory.length,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalStockUnits,
      totalValuationCost,
      totalValuationRetail,
    };
  }, [inventory]);

  // Filter & Sort Logic
  const filteredInventory = useMemo(() => {
    let result = inventory.filter((item) => {
      // Branch filter
      if (selectedBranchFilter !== 'all' && item.branchId !== selectedBranchFilter) return false;

      // School filter
      if (selectedSchoolFilter !== 'ALL' && item.school !== selectedSchoolFilter) return false;

      // Category filter
      if (selectedCategoryFilter !== 'ALL' && item.category !== selectedCategoryFilter) return false;

      // Status chip filter
      if (statusFilter === 'OUT' && item.currentStock !== 0) return false;
      if (statusFilter === 'LOW' && (item.currentStock === 0 || (!item.isLow && item.currentStock > item.reorderLevel))) return false;
      if (statusFilter === 'HEALTHY' && (item.currentStock === 0 || item.isLow || item.currentStock <= item.reorderLevel)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.productName.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.school.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.size.toLowerCase().includes(q) ||
          (item.barcode && item.barcode.includes(q))
        );
      }

      return true;
    });

    // Sorting
    if (sortBy === 'STOCK_ASC') {
      result.sort((a, b) => a.currentStock - b.currentStock);
    } else if (sortBy === 'STOCK_DESC') {
      result.sort((a, b) => b.currentStock - a.currentStock);
    } else if (sortBy === 'PRICE_ASC') {
      result.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (sortBy === 'PRICE_DESC') {
      result.sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (sortBy === 'NAME_ASC') {
      result.sort((a, b) => a.productName.localeCompare(b.productName));
    }

    return result;
  }, [inventory, selectedBranchFilter, selectedSchoolFilter, selectedCategoryFilter, statusFilter, searchQuery, sortBy]);

  // SKU Modal Opener
  const handleOpenSkuModal = async (sku?: string) => {
    setSelectedSkuForModal(sku);
    if (allProducts.length === 0) {
      try {
        const prods = await api.getProducts();
        setAllProducts(prods);
      } catch (e) {
        // Fallback
      }
    }
    setIsSkuImageModalOpen(true);
  };

  // Sync to Firestore Database
  const handleSaveInventoryToFirestore = async () => {
    if (inventory.length === 0) {
      notify({ type: 'WARNING', title: 'Inventory Empty', message: 'No inventory items available to save.' });
      return;
    }

    setIsSyncingDb(true);
    try {
      let prods = allProducts;
      if (!prods || prods.length === 0) {
        prods = await api.getProducts();
        setAllProducts(prods);
      }

      const result = await syncInventoryToFirestore(inventory, prods);
      notify({
        type: 'SUCCESS',
        title: 'Inventory Saved to Firestore Database',
        message: `Successfully synchronized ${result.inventoryCount} uniform stock items to your Firestore database.`,
      });
    } catch (err: any) {
      console.error('Failed to sync inventory to database:', err);
      notify({
        type: 'ERROR',
        title: 'Database Save Failed',
        message: err.message || 'Could not save inventory to Firestore. Please check database configuration.',
      });
    } finally {
      setIsSyncingDb(false);
    }
  };

  // Stock Adjustment Handlers
  const openAdjustModal = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustNewStock(item.currentStock);
    setAdjustReason('PHYSICAL_COUNT');
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;

    setIsSubmittingAdjust(true);
    try {
      await api.adjustInventory({
        productId: adjustItem.productId,
        variantId: adjustItem.variantId,
        branchId: adjustItem.branchId,
        newStock: Math.max(0, Number(adjustNewStock)),
        reason: adjustReason,
        notes: adjustNotes,
      });

      notify({
        type: 'SUCCESS',
        title: 'Stock Updated',
        message: `${adjustItem.sku} stock set to ${adjustNewStock} units at ${adjustItem.branchName}`,
      });

      setIsAdjustModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Adjustment Failed', message: err.message });
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Fast 1-Tap Touch Stepper Adjustment (+1 / -1)
  const handleQuickDeltaAdjust = async (item: InventoryItem, delta: number) => {
    const targetStock = Math.max(0, item.currentStock + delta);
    if (targetStock === item.currentStock) return;

    setQuickAdjustingSku(item.sku);
    try {
      await api.adjustInventory({
        productId: item.productId,
        variantId: item.variantId,
        branchId: item.branchId,
        newStock: targetStock,
        reason: delta > 0 ? 'QUICK_ADD' : 'QUICK_DEDUCT',
        notes: `Mobile 1-tap quick ${delta > 0 ? 'add' : 'deduct'} by ${user?.name || 'Admin'}`,
      });

      // Optimistic update
      setInventory((prev) =>
        prev.map((i) =>
          i.variantId === item.variantId && i.branchId === item.branchId
            ? { ...i, currentStock: targetStock, isLow: targetStock <= i.reorderLevel }
            : i
        )
      );

      notify({
        type: 'SUCCESS',
        title: `${item.sku} Stock ${delta > 0 ? '+1' : '-1'}`,
        message: `Stock updated to ${targetStock} units at ${item.branchName}`,
      });
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Quick Adjust Failed', message: err.message });
    } finally {
      setQuickAdjustingSku(null);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Product Name', 'School', 'Category', 'SKU', 'Size', 'Branch', 'Available Stock', 'Threshold', 'Cost Value (KES)', 'Selling Price (KES)'];
    const rows = filteredInventory.map((item) => [
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.school.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      `"${item.sku.replace(/"/g, '""')}"`,
      `"${item.size.replace(/"/g, '""')}"`,
      `"${item.branchName.replace(/"/g, '""')}"`,
      item.currentStock,
      item.reorderLevel,
      item.costPrice,
      item.sellingPrice,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naisiae_stock_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* ==================================================== */}
      {/* 1. TOP HEADER & MULTI-VIEW BAR                      */}
      {/* ==================================================== */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#030A91] text-[10px] font-black uppercase tracking-wider">
              Stock Control & ERP
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {stats.totalSkus} Uniform SKUs Loaded
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Uniform Stock Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time branch inventory with touch adjustments, automated replenishment alerts, and SKU photo control.
          </p>
        </div>

        {/* Global Action Buttons & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Firestore Sync Button */}
          <button
            onClick={handleSaveInventoryToFirestore}
            disabled={isSyncingDb || isLoading}
            className="inline-flex items-center justify-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
            title="Save complete multi-branch inventory into the Firestore database"
          >
            {isSyncingDb ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5 mr-1.5 text-emerald-200" />
            )}
            <span>{isSyncingDb ? 'Saving...' : 'Save to DB'}</span>
          </button>

          {/* SKU Image Manager */}
          <button
            onClick={() => handleOpenSkuModal()}
            className="inline-flex items-center justify-center px-3 py-2 bg-[#030A91] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-[#FACB00]" />
            <span>SKU Photos</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Main Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'STOCK'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stock ({filteredInventory.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ALERTS')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'ALERTS'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Alerts ({alerts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. STATS & QUICK KPI SUMMARY TILES                  */}
      {/* ==================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Total SKUs */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total SKUs</span>
            <Package className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">{stats.totalSkus}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Active sizes & items</div>
        </div>

        {/* Total Physical Stock Units */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Units</span>
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">
            {stats.totalStockUnits.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Physical garment units</div>
        </div>

        {/* Healthy Stock */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'HEALTHY' ? 'ALL' : 'HEALTHY')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'HEALTHY'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">In Stock</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700">{stats.inStockCount}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Healthy threshold</div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'LOW' ? 'ALL' : 'LOW')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'LOW'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-700">{stats.lowStockCount}</div>
          <div className="text-[10px] text-amber-600 font-medium mt-0.5">Need reordering</div>
        </div>

        {/* Out of Stock Alert */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'OUT' ? 'ALL' : 'OUT')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'OUT'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200/90 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Out of Stock</span>
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700">{stats.outOfStockCount}</div>
          <div className="text-[10px] text-rose-600 font-medium mt-0.5">Immediate action</div>
        </div>

        {/* Total Stock Valuation */}
        <div className="bg-gradient-to-br from-[#030A91] to-blue-900 text-white p-3.5 rounded-2xl border border-blue-900 shadow-2xs">
          <div className="flex items-center justify-between text-blue-200 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Stock Value</span>
            <Tag className="w-3.5 h-3.5 text-[#FACB00]" />
          </div>
          <div className="text-base sm:text-lg font-black text-white truncate">
            KES {stats.totalValuationRetail.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-200 font-medium mt-0.5 truncate">
            {canAccessFinancials ? `Cost: KES ${stats.totalValuationCost.toLocaleString()}` : 'Retail Valuation'}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 3. CONTROLS, VIEW TOGGLE & SEARCH BAR               */}
      {/* ==================================================== */}
      {activeTab === 'STOCK' && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
          {/* Row 1: Search + View Mode Switcher + Status Chips */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input with Instant Clear */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search uniform garment, size, school, SKU, or barcode..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle (App Cards vs Desktop Table) */}
            <div className="flex items-center justify-between md:justify-end gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('CARDS')}
                  className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                    viewMode === 'CARDS'
                      ? 'bg-white text-[#030A91] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="App-style cards layout (Mobile friendly)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>App Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                    viewMode === 'TABLE'
                      ? 'bg-white text-[#030A91] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Data table layout (Desktop dense)"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Status Chips & Dropdown Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1 border-t border-slate-100">
            {/* Status Chips (Horizontal scrollable on mobile) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-[#030A91] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Stock ({stats.totalSkus})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('LOW')}
                className={`px-3 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1 ${
                  statusFilter === 'LOW'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <span>⚠️ Low Stock</span>
                <span className="text-[10px] opacity-90">({stats.lowStockCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('OUT')}
                className={`px-3 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1 ${
                  statusFilter === 'OUT'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                <span>❌ Out of Stock</span>
                <span className="text-[10px] opacity-90">({stats.outOfStockCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('HEALTHY')}
                className={`px-3 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1 ${
                  statusFilter === 'HEALTHY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span>✅ Healthy</span>
                <span className="text-[10px] opacity-90">({stats.inStockCount})</span>
              </button>
            </div>

            {/* Filter Dropdowns (Branch, School, Category, Sort) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Branch Filter */}
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#030A91]"
              >
                <option value="all">🏢 All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* School Filter */}
              <select
                value={selectedSchoolFilter}
                onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#030A91]"
              >
                <option value="ALL">🏫 All Schools</option>
                {schools.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#030A91]"
              >
                <option value="ALL">👔 All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Sort By Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#030A91]"
              >
                <option value="DEFAULT">Sort: Default</option>
                <option value="STOCK_ASC">Stock: Low → High</option>
                <option value="STOCK_DESC">Stock: High → Low</option>
                <option value="PRICE_ASC">Price: Low → High</option>
                <option value="PRICE_DESC">Price: High → Low</option>
                <option value="NAME_ASC">Name: A → Z</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. STOCK CONTENT: CARDS VIEW (APP-LIKE ON MOBILE)    */}
      {/* ==================================================== */}
      {activeTab === 'STOCK' && viewMode === 'CARDS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredInventory.map((item) => {
              const isOutOfStock = item.currentStock === 0;
              const isLowStock = !isOutOfStock && (item.isLow || item.currentStock <= item.reorderLevel);
              const isAdjusting = quickAdjustingSku === item.sku;

              return (
                <div
                  key={`${item.variantId}-${item.branchId}`}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group hover:border-[#030A91]/40"
                >
                  {/* Card Header & Image */}
                  <div className="p-4 pb-2">
                    {/* Top Tag Bar */}
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 truncate max-w-[140px]">
                        {item.school || 'General'}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>

                    {/* Garment Details & Image Row */}
                    <div className="flex items-start space-x-3">
                      {/* Image Thumbnail with Click-to-Manage shortcut */}
                      <div
                        onClick={() => handleOpenSkuModal(item.sku)}
                        className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer group/img hover:border-[#030A91]"
                        title="Tap to view or change SKU photo"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.sku}
                            className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 group-hover/img:text-blue-600 bg-slate-50">
                            <ImageIcon className="w-5 h-5 mb-0.5" />
                            <span className="text-[8px] font-bold uppercase text-slate-400">Photo</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                          Edit
                        </div>
                      </div>

                      {/* Title & Metadata */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-[#030A91] transition-colors leading-tight line-clamp-2">
                          {item.productName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="font-black text-[11px] bg-blue-50 text-[#030A91] px-2 py-0.5 rounded-md">
                            Size {item.size}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.sku}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-1 truncate">
                          <Store className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.branchName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Metrics & Visual Gauge */}
                  <div className="px-4 py-2 bg-slate-50/70 border-t border-b border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500 font-semibold">Available Units:</span>
                      <div className="flex items-baseline space-x-1">
                        <span
                          className={`text-lg font-black ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {item.currentStock}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">units</span>
                      </div>
                    </div>

                    {/* Stock Progress / Gauge against reorder level */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOutOfStock
                            ? 'bg-rose-500 w-0'
                            : isLowStock
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(5, (item.currentStock / Math.max(1, item.reorderLevel * 2)) * 100))}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>Reorder Min: {item.reorderLevel} units</span>
                      <span>Target: {item.reorderQuantity || 20}</span>
                    </div>

                    {/* Price & Valuation */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 text-xs">
                      <span className="font-bold text-slate-500">Retail Price:</span>
                      <span className="font-extrabold text-[#030A91]">
                        KES {item.sellingPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Quick Touch Actions */}
                  <div className="p-3 bg-white flex items-center justify-between gap-2">
                    {/* Stepper +/- 1-tap quick adjust buttons */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        disabled={isAdjusting || item.currentStock <= 0}
                        onClick={() => handleQuickDeltaAdjust(item, -1)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 disabled:opacity-40 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                        title="Reduce stock by 1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isAdjusting}
                        onClick={() => handleQuickDeltaAdjust(item, 1)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 disabled:opacity-40 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                        title="Increase stock by 1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Adjust Details Button */}
                    <button
                      type="button"
                      onClick={() => openAdjustModal(item)}
                      className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-[#030A91] hover:text-white text-slate-800 rounded-xl text-xs font-bold transition-all text-center active:scale-98 cursor-pointer"
                    >
                      Audit / Adjust
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredInventory.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <Package className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">No uniform stock records found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting your search query, branch filter, or stock status chips.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setSelectedSchoolFilter('ALL');
                    setSelectedCategoryFilter('ALL');
                  }}
                  className="px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. STOCK CONTENT: DESKTOP TABLE VIEW                */}
      {/* ==================================================== */}
      {activeTab === 'STOCK' && viewMode === 'TABLE' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Garment & School</th>
                  <th className="py-3.5 px-3">Size & SKU</th>
                  <th className="py-3.5 px-3">Branch</th>
                  <th className="py-3.5 px-3 text-center">Available Stock</th>
                  <th className="py-3.5 px-3">Reorder Threshold</th>
                  {canAccessFinancials && <th className="py-3.5 px-3 text-right">Cost Value</th>}
                  <th className="py-3.5 px-3 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-center">Touch Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const isOutOfStock = item.currentStock === 0;
                  const isLowStock = !isOutOfStock && (item.isLow || item.currentStock <= item.reorderLevel);

                  return (
                    <tr key={`${item.variantId}-${item.branchId}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            onClick={() => handleOpenSkuModal(item.sku)}
                            className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer group hover:border-[#030A91]"
                            title="Click to view/change photo"
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.sku}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 group-hover:text-[#030A91]">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">
                              {item.productName}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">
                              {item.school} • {item.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Size & SKU */}
                      <td className="py-3 px-3">
                        <span className="font-black text-[#030A91] bg-blue-50 px-2 py-0.5 rounded text-[11px] inline-block">
                          Size {item.size}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          {item.sku}
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {item.branchName}
                      </td>

                      {/* Available Stock Pill */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-full inline-block ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.currentStock} units
                        </span>
                      </td>

                      {/* Threshold */}
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        Min: <strong>{item.reorderLevel}</strong> | Reorder: {item.reorderQuantity}
                      </td>

                      {/* Cost Valuation */}
                      {canAccessFinancials && (
                        <td className="py-3 px-3 text-right font-medium text-slate-600">
                          KES {item.totalValuationCost.toLocaleString()}
                        </td>
                      )}

                      {/* Selling Price */}
                      <td className="py-3 px-3 text-right font-black text-[#030A91]">
                        KES {item.sellingPrice.toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickDeltaAdjust(item, -1)}
                            disabled={item.currentStock <= 0}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 disabled:opacity-40"
                            title="-1 unit"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickDeltaAdjust(item, 1)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700"
                            title="+1 unit"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openAdjustModal(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#030A91] hover:bg-blue-900 text-white text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No uniform inventory records matching your active filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. TAB 2: AUTOMATED LOW STOCK ALERTS                 */}
      {/* ==================================================== */}
      {activeTab === 'ALERTS' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-950">
                  Automated Low Stock & Replenishment Monitor
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Items below minimum threshold. Generate Purchase Orders or transfer stock from Uhuru Market HQ.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{a.school}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        a.urgency === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {a.urgency}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 mt-1">{a.productName}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Branch: <strong>{a.branchName}</strong> | Size: <strong>{a.size}</strong>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Available:</span>
                    <span className="font-black text-rose-600 text-base">{a.currentStock} units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Suggested Reorder:</span>
                    <span className="font-bold text-slate-800">{a.suggestedReorder} units</span>
                  </div>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 p-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-base font-bold text-slate-800">All uniform stocks are healthy!</h4>
                <p className="text-xs text-slate-500 mt-1">No items are currently below their reorder threshold.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. TAB 3: IMMUTABLE STOCK LEDGER                     */}
      {/* ==================================================== */}
      {activeTab === 'MOVEMENTS' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-slate-800">
                Immutable Stock Movement Ledger
              </h3>
              <p className="text-xs text-slate-500">Atomic inventory transactions across branches</p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {movements.length} audit entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase bg-white">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Garment / SKU</th>
                  <th className="py-3 px-3">Branch</th>
                  <th className="py-3 px-3 text-center">Movement</th>
                  <th className="py-3 px-3 text-center">New Balance</th>
                  <th className="py-3 px-3">Reference / Reason</th>
                  <th className="py-3 px-4">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.type === 'SALE'
                            ? 'bg-blue-100 text-blue-800'
                            : m.type === 'PURCHASE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.type === 'TRANSFER_IN' || m.type === 'TRANSFER_OUT'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                        {m.productName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{m.sku}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{m.branchName}</td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span
                        className={`inline-flex items-center ${
                          m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {m.newStock} units
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="font-mono text-xs font-bold text-slate-900 block">
                        {m.referenceNumber}
                      </span>
                      <span className="text-[10px] text-slate-500">{m.reason || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{m.userName}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 8. MOBILE-FRIENDLY STOCK ADJUSTMENT MODAL           */}
      {/* ==================================================== */}
      {isAdjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#030A91] to-blue-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#FACB00] tracking-wider">
                  Audit Stock Adjustment
                </span>
                <h3 className="font-black text-sm text-white truncate max-w-[280px]">
                  {adjustItem.productName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="p-5 space-y-4">
              {/* Item Snapshot */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch Location:</span>
                  <span className="font-bold text-slate-900">{adjustItem.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU & Size:</span>
                  <span className="font-bold text-slate-900">
                    {adjustItem.sku} • Size {adjustItem.size}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold">Current System Stock:</span>
                  <span className="font-black text-sm text-[#030A91]">
                    {adjustItem.currentStock} units
                  </span>
                </div>
              </div>

              {/* Mobile Rapid Stepper Chips */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  New Physical Stock Count:
                </label>

                {/* Quick Touch Stepper Buttons (Ideal for mobile phones!) */}
                <div className="flex items-center space-x-1.5 mb-2 overflow-x-auto pb-1">
                  {[-10, -5, -1, 1, 5, 10].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setAdjustNewStock((prev) => Math.max(0, prev + step))}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-[#030A91] font-bold text-xs transition-all active:scale-95"
                    >
                      {step > 0 ? `+${step}` : step}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={adjustNewStock}
                    onChange={(e) => setAdjustNewStock(Math.max(0, Number(e.target.value)))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                    required
                    autoFocus
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {adjustNewStock !== adjustItem.currentStock && (
                      <span
                        className={
                          adjustNewStock > adjustItem.currentStock
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }
                      >
                        {adjustNewStock > adjustItem.currentStock
                          ? `+${adjustNewStock - adjustItem.currentStock}`
                          : `${adjustNewStock - adjustItem.currentStock}`}{' '}
                        units
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Mandatory Audit Reason:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                >
                  <option value="PHYSICAL_COUNT">Routine Stocktake / Cycle Count</option>
                  <option value="DAMAGED_GOODS">Damaged / Stained / Defective Fabric</option>
                  <option value="OPENING_BALANCE">Initial Opening Balance Entry</option>
                  <option value="CORRECTION">Data Entry Discrepancy Correction</option>
                  <option value="RETURN">Customer Return Reconciliation</option>
                </select>
              </div>

              {/* Audit Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Notes & Reference:
                </label>
                <textarea
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Physical inventory verified by storekeeper..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="flex-1 py-2.5 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingAdjust ? 'Committing...' : 'Commit Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 9. SKU IMAGE FILES & CATEGORIES MODAL                */}
      {/* ==================================================== */}
      {isSkuImageModalOpen && (
        <SkuImageManagerModal
          isOpen={isSkuImageModalOpen}
          onClose={() => setIsSkuImageModalOpen(false)}
          products={allProducts}
          onRefresh={async () => {
            const prods = await api.getProducts();
            setAllProducts(prods);
            await fetchInventory();
          }}
          initialSku={selectedSkuForModal}
        />
      )}
    </div>
  );
};
