import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { Product, ProductVariant, Customer } from '../types';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  UserPlus,
  RefreshCw,
  X,
  Printer,
  FileText
} from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { normalizeImageUrl } from './ProductsView';

interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  school: string;
  size: string;
  color: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discountAmount: number;
  availableStock: number;
}

export const PosView: React.FC = () => {
  const { user, activeBranchId, branches } = useAuth();
  const { notify } = useNotification();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState<string[]>([]);

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-walkin');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA' | 'CARD' | 'BANK_TRANSFER' | 'CREDIT'>('MPESA');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [simulateKraOffline, setSimulateKraOffline] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  // Variant selector modal
  const [activeProductForVariant, setActiveProductForVariant] = useState<Product | null>(null);

  // Completed Sale Receipt Modal
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [completedQrCode, setCompletedQrCode] = useState<string>('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Recent Sales & Reprint Modal
  const [isRecentModalOpen, setIsRecentModalOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  // Barcode Scanner Modal
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Effective branch for POS: If staff, always their assigned branch. If admin/accountant, current selected branch
  const effectiveBranchId = (user?.role === 'STAFF' && user?.branchId !== 'all')
    ? user.branchId
    : (activeBranchId === 'all' ? branches[0]?.id : activeBranchId);

  const currentBranch = branches.find((b) => b.id === effectiveBranchId) || branches[0];

  const loadData = async () => {
    try {
      const [prodData, custList, schoolList] = await Promise.all([
        api.getProducts({ activeOnly: true }),
        api.getCustomers(),
        api.getSchools(),
      ]);
      setProducts(prodData);
      setCustomers(custList);
      setSchools(schoolList);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Data Load Failed', message: err.message });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (selectedSchool !== 'ALL' && p.school !== selectedSchool) return false;
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q);
      const matchVariant = p.variants.some((v) => v.sku.toLowerCase().includes(q) || v.barcode.includes(q));
      if (!matchName && !matchVariant) return false;
    }
    return true;
  });

  // Add variant to cart with branch stock verification
  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    const stockAvailable = variant.branchStock[effectiveBranchId] ?? 0;
    if (stockAvailable <= 0) {
      notify({
        type: 'ERROR',
        title: 'Out of Stock',
        message: `${product.name} (Size: ${variant.size}) is out of stock at ${currentBranch?.name}.`,
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        if (existing.quantity + 1 > stockAvailable) {
          notify({
            type: 'WARNING',
            title: 'Max Stock Reached',
            message: `Only ${stockAvailable} units available at this branch.`,
          });
          return prev;
        }
        return prev.map((item) =>
          item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            sku: variant.sku,
            school: product.school,
            size: variant.size,
            color: variant.color,
            unitPrice: variant.sellingPrice,
            costPrice: variant.costPrice,
            quantity: 1,
            discountAmount: 0,
            availableStock: stockAvailable,
          },
        ];
      }
    });

    setActiveProductForVariant(null);
  };

  // Barcode quick scan
  const handleBarcodeScan = (code: string) => {
    let found = false;
    for (const prod of products) {
      for (const v of prod.variants) {
        if (v.barcode === code || v.sku.toLowerCase() === code.toLowerCase()) {
          handleAddToCart(prod, v);
          found = true;
          notify({
            type: 'SUCCESS',
            title: 'Item Scanned',
            message: `Added ${prod.name} (${v.size}) to cart`,
          });
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      notify({
        type: 'ERROR',
        title: 'Barcode Not Found',
        message: `No product found matching barcode/SKU '${code}'`,
      });
    }
  };

  const updateCartQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            if (newQty > item.availableStock) {
              notify({
                type: 'WARNING',
                title: 'Insufficient Stock',
                message: `Only ${item.availableStock} units available at ${currentBranch?.name}`,
              });
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount, 0);
  const cartTax = cartSubtotal - cartSubtotal / 1.16; // Standard 16% VAT inclusive
  const totalPayable = cartSubtotal;
  const numTendered = Number(amountTendered) || totalPayable;
  const changeDue = Math.max(0, numTendered - totalPayable);

  // Complete Sale
  const handleCheckout = async () => {
    if (!cart.length) {
      notify({ type: 'WARNING', title: 'Cart Empty', message: 'Add uniforms to cart before checkout.' });
      return;
    }

    if (paymentMethod === 'MPESA' && !paymentReference.trim()) {
      notify({
        type: 'WARNING',
        title: 'M-PESA Code Required',
        message: 'Please enter the M-Pesa transaction code (e.g. QKJ9283741)',
      });
      return;
    }

    setIsProcessingCheckout(true);
    const selectedCust = customers.find((c) => c.id === selectedCustomerId);

    try {
      const payload = {
        branchId: effectiveBranchId,
        customerId: selectedCustomerId !== 'cust-walkin' ? selectedCustomerId : undefined,
        customerName: selectedCust ? selectedCust.name : 'Walk-In Customer (Cash/MPESA)',
        customerPhone: selectedCust ? selectedCust.phone : undefined,
        customerEmail: selectedCust ? selectedCust.email : undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: item.sku,
          school: item.school,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
        })),
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        amountTendered: paymentMethod === 'CASH' ? numTendered : totalPayable,
        simulateKraOffline,
      };

      const result = await api.createSale(payload);

      notify({
        type: 'SUCCESS',
        title: 'Sale Completed',
        message: `Receipt ${result.sale.receiptNumber} generated! Total: KES ${result.sale.totalAmount.toLocaleString()}`,
      });

      // Show receipt modal
      setCompletedSale(result.sale);
      setCompletedQrCode(result.qrCodeDataUrl);
      setIsReceiptModalOpen(true);

      // Reset cart and checkout states
      setCart([]);
      setAmountTendered('');
      setPaymentReference('');
      setSelectedCustomerId('cust-walkin');

      // Refresh product stock
      loadData();
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Checkout Failed',
        message: err.message || 'Transaction could not be completed',
      });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleOpenRecentSales = async () => {
    setIsRecentModalOpen(true);
    setIsLoadingRecent(true);
    try {
      const sales = await api.getSales({ branchId: effectiveBranchId });
      setRecentSales(sales.slice(0, 20));
    } catch {
      notify({ type: 'ERROR', title: 'Error', message: 'Failed to load recent receipts' });
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleSelectRecentSale = (sale: any) => {
    setCompletedSale(sale);
    setCompletedQrCode(sale.kraQrCodeUrl || '');
    setIsRecentModalOpen(false);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 -m-4 md:-m-8 p-4 md:p-8 min-h-[calc(100vh-4rem)]">
      {/* ==================================================== */}
      {/* LEFT SECTION: PRODUCT CATALOG & BARCODE SCANNER       */}
      {/* ==================================================== */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Top Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800">
              Station: {currentBranch?.name}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenRecentSales}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-blue-50 text-[#030A91] border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors shadow-2xs"
              title="Preview past transactions and reprint thermal receipts"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-[#030A91]" />
              <span>Receipts / Reprint</span>
            </button>

            <button
              onClick={() => setIsBarcodeModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors shadow-xs"
            >
              <Barcode className="w-4 h-4 mr-1.5 text-[#FACB00]" />
              Barcode Scanner
            </button>
            <button
              onClick={loadData}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              title="Refresh inventory"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & School Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by uniform name, school, SKU, or size..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#030A91]"
            />
          </div>

          {/* School filter horizontal scroll pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs select-none">
            <button
              onClick={() => setSelectedSchool('ALL')}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors ${
                selectedSchool === 'ALL'
                  ? 'bg-[#030A91] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Schools
            </button>
            {schools.map((sch) => (
              <button
                key={sch}
                onClick={() => setSelectedSchool(sch)}
                className={`px-3 py-1 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                  selectedSchool === sch
                    ? 'bg-[#030A91] text-white shadow-xs font-bold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {sch}
              </button>
            ))}
          </div>

          {/* Category filter pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs select-none">
            {['ALL', 'SHIRTS', 'TROUSERS', 'SKIRTS', 'BLAZERS', 'SWEATERS', 'TRACKSUITS', 'TIES', 'SOCKS'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#FACB00] text-[#030A91] font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.replace(/_/g, ' ')}
                </button>
              )
            )}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] lg:max-h-none pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts.map((product) => {
              // Calculate total stock across variants for this branch
              const totalBranchStock = product.variants.reduce(
                (sum, v) => sum + (v.branchStock[effectiveBranchId] || 0),
                0
              );
              const minPrice = Math.min(...product.variants.map((v) => v.sellingPrice));

              return (
                <div
                  key={product.id}
                  onClick={() => setActiveProductForVariant(product)}
                  className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs hover:border-[#030A91] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group overflow-hidden"
                >
                  <div>
                    {product.imageUrl && (
                      <div className="h-28 w-full rounded-xl overflow-hidden mb-2 bg-slate-100 border border-slate-100">
                        <img
                          src={normalizeImageUrl(product.imageUrl)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {product.school}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          totalBranchStock > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {totalBranchStock > 0 ? `${totalBranchStock} in stock` : 'Out of Stock'}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2 group-hover:text-[#030A91] transition-colors">
                      {product.name}
                    </h4>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {product.variants.slice(0, 4).map((v) => (
                        <span
                          key={v.id}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-700"
                        >
                          Size {v.size}
                        </span>
                      ))}
                      {product.variants.length > 4 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{product.variants.length - 4} sizes
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-[#030A91]">
                      From KES {minPrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-[#030A91] flex items-center">
                      Select Size &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto opacity-40 mb-2" />
              <p className="text-sm font-semibold">No school uniforms match the selected criteria.</p>
              <p className="text-xs mt-1">Try resetting filters or searching with another keyword.</p>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* RIGHT SECTION: ACTIVE CART & CHECKOUT TENDER          */}
      {/* ==================================================== */}
      <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-4 h-4 text-[#030A91]" />
            <h3 className="font-extrabold text-sm text-slate-900">Current Checkout</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#030A91] text-white">
            {cart.reduce((s, i) => s + i.quantity, 0)} items
          </span>
        </div>

        {/* Customer Selector */}
        <div className="p-3 border-b border-slate-200 bg-white">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Assign Customer / Account:
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#030A91]"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.schoolOrOrg ? `(${c.schoolOrOrg})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64 lg:max-h-72 divide-y divide-slate-100">
          {cart.map((item) => (
            <div key={item.variantId} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {item.productName}
                </p>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                  <span className="font-mono bg-slate-100 px-1 rounded">Size: {item.size}</span>
                  <span>KES {item.unitPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => updateCartQuantity(item.variantId, -1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateCartQuantity(item.variantId, 1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => removeFromCart(item.variantId)}
                  className="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              <p className="text-xs">Cart is empty.</p>
              <p className="text-[11px] mt-0.5">Select school uniform sizes or scan barcode to add.</p>
            </div>
          )}
        </div>

        {/* Payment & Checkout Panel */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {/* Subtotal & VAT calculation */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (Net Excl. VAT):</span>
              <span>KES {(cartSubtotal - cartTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>KRA 16% Standard VAT:</span>
              <span>KES {cartTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL PAYABLE:</span>
              <span className="text-[#030A91]">KES {totalPayable.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Methods Tabs */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Payment Tender:
            </label>
            <div className="grid grid-cols-4 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setPaymentMethod('MPESA')}
                className={`py-1.5 rounded-lg font-bold flex flex-col items-center justify-center transition-colors ${
                  paymentMethod === 'MPESA'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 mb-0.5" />
                <span>M-PESA</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-1.5 rounded-lg font-bold flex flex-col items-center justify-center transition-colors ${
                  paymentMethod === 'CASH'
                    ? 'bg-[#030A91] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-3.5 h-3.5 mb-0.5" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-1.5 rounded-lg font-bold flex flex-col items-center justify-center transition-colors ${
                  paymentMethod === 'CARD'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 mb-0.5" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT')}
                className={`py-1.5 rounded-lg font-bold flex flex-col items-center justify-center transition-colors ${
                  paymentMethod === 'CREDIT'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building className="w-3.5 h-3.5 mb-0.5" />
                <span>Credit</span>
              </button>
            </div>
          </div>

          {/* Conditional tender inputs */}
          {paymentMethod === 'MPESA' && (
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                M-PESA Confirmation Ref / STK Code:
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value.toUpperCase())}
                placeholder="e.g. QKJ892318M"
                className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {paymentMethod === 'CASH' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Cash Tendered:
                </label>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder={totalPayable.toString()}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Change Due:
                </label>
                <div className="px-3 py-1.5 text-xs font-black text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                  KES {changeDue.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* KRA eTIMS Offline Test Mode toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-[11px] text-slate-600 flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={simulateKraOffline}
                onChange={(e) => setSimulateKraOffline(e.target.checked)}
                className="mr-1.5 rounded text-[#030A91]"
              />
              <span>Simulate KRA Offline (Tests Retry Queue)</span>
            </label>
          </div>

          {/* Complete Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessingCheckout}
            className="w-full py-3 bg-[#030A91] text-white rounded-xl text-xs font-black tracking-wider uppercase hover:bg-blue-900 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#FACB00]" />
            <span>
              {isProcessingCheckout ? 'Fiscalizing & Processing...' : `Complete Sale • KES ${totalPayable.toLocaleString()}`}
            </span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* VARIANT / SIZE SELECTION MODAL                       */}
      {/* ==================================================== */}
      {activeProductForVariant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#FACB00]">
                  {activeProductForVariant.school}
                </span>
                <h3 className="font-bold text-sm leading-tight">
                  {activeProductForVariant.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveProductForVariant(null)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Garment Size Variant:
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activeProductForVariant.variants.map((v) => {
                  const stock = v.branchStock[effectiveBranchId] ?? 0;
                  const isAvailable = stock > 0;
                  return (
                    <button
                      key={v.id}
                      disabled={!isAvailable}
                      onClick={() => handleAddToCart(activeProductForVariant, v)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        isAvailable
                          ? 'border-slate-200 hover:border-[#030A91] hover:bg-blue-50/50'
                          : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-900">Size {v.size}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({v.sku})</span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold mt-0.5 block ${
                            isAvailable ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isAvailable ? `${stock} units available at this branch` : 'Out of stock at this branch'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#030A91] block">
                          KES {v.sellingPrice.toLocaleString()}
                        </span>
                        {isAvailable && (
                          <span className="text-[10px] bg-[#FACB00] text-slate-900 font-bold px-1.5 py-0.5 rounded">
                            Add +
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode scanner simulator modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        products={products}
        onScan={handleBarcodeScan}
      />

      {/* Recent Receipts / Reprint Modal */}
      {isRecentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-[#FACB00]" />
                <h3 className="font-extrabold text-sm">Station Receipts & Reprints</h3>
              </div>
              <button
                onClick={() => setIsRecentModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-xs text-slate-500 mb-3">
                Select any recent sale from this checkout station to preview and print its official thermal receipt:
              </p>

              {isLoadingRecent ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading recent station receipts...
                </div>
              ) : recentSales.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No sales recorded on this station today yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {recentSales.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectRecentSale(s)}
                      className="p-3 rounded-2xl border border-slate-200 hover:border-[#030A91] hover:bg-blue-50/50 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-[#030A91]">
                            {s.receiptNumber}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            {s.paymentMethod}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {s.customerName} • {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-xs text-[#030A91] block">
                          KES {s.totalAmount.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 group-hover:underline inline-flex items-center mt-0.5">
                          <span>Preview</span> &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Printable Thermal Receipt modal */}
      <ReceiptModal
        sale={completedSale}
        qrCodeDataUrl={completedQrCode}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
};
