import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "../api";
import { Product, ProductVariant, Sale, PaymentReceipt } from "../types";
import { useNotification } from "../context/NotificationContext";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Smartphone,
  CreditCard,
  RefreshCw,
  X,
  Shirt,
  Building,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Lock,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../firebase";
import { ReceiptModal } from "../components/ReceiptModal";
import { normalizeImageUrl } from "./ProductsView";

interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  school: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}

export const PortalView: React.FC = () => {
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Authentication
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");
  const [paymentMethod, setPaymentMethod] = useState<"MPESA" | "CARD">("MPESA");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Modals
  const [activeProductForVariant, setActiveProductForVariant] = useState<Product | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<PaymentReceipt | null>(null);
  const [completedQrCode, setCompletedQrCode] = useState<string>("");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Listen to Firebase Google auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const loadPortalData = async () => {
    setIsLoading(true);
    try {
      const [prods, schs] = await Promise.all([
        api.getPortalProducts(),
        api.getPortalSchools(),
      ]);
      setProducts(prods);
      setSchools(schs);
    } catch (err: any) {
      notify({ type: "ERROR", title: "Catalog Error", message: err.message || "Failed to load products" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      notify({
        type: "SUCCESS",
        title: "Signed In with Google",
        message: `Welcome ${result.user.displayName || "Customer"}! You can now checkout seamlessly.`,
      });
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        notify({ type: "ERROR", title: "Sign-In Failed", message: err.message });
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      notify({ type: "INFO", title: "Signed Out", message: "You have signed out of your Google account." });
    } catch (err: any) {
      notify({ type: "ERROR", title: "Error", message: err.message });
    }
  };

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedSchool !== "ALL" && p.school !== selectedSchool) return false;
      if (selectedCategory !== "ALL" && p.category !== selectedCategory && p.garmentType !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSchool = p.school.toLowerCase().includes(q);
        const matchesCategory = p.category && p.category.toLowerCase().includes(q);
        const matchesVariant = p.variants?.some((v) => v.sku.toLowerCase().includes(q) || v.size.toLowerCase().includes(q));
        return matchesName || matchesSchool || matchesCategory || matchesVariant;
      }
      return true;
    });
  }, [products, selectedSchool, selectedCategory, searchQuery]);

  // Cart operations
  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          sku: variant.sku,
          school: product.school,
          size: variant.size,
          color: variant.color || "Standard",
          unitPrice: variant.sellingPrice,
          quantity: 1,
          imageUrl: variant.imageUrl || product.imageUrl,
        },
      ];
    });

    notify({
      type: "SUCCESS",
      title: "Added to Cart",
      message: `${product.name} (Size ${variant.size}) added to your cart.`,
    });
    setActiveProductForVariant(null);
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
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

  const totalQuantity = cart.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const vatAmount = totalAmount - totalAmount / 1.16;

  // Checkout Execution
  const handleCheckout = async () => {
    if (!cart.length) {
      notify({ type: "WARNING", title: "Cart Empty", message: "Please select uniforms before checking out." });
      return;
    }

    if (!currentUser) {
      notify({
        type: "INFO",
        title: "Google Sign-In Required",
        message: "Please sign in with Google to complete your checkout and receive your official eTIMS receipt.",
      });
      await handleGoogleSignIn();
      return;
    }

    if (paymentMethod === "MPESA") {
      const phone = mpesaPhone.trim();
      const isTenDigit = phone.length === 10 && (phone.startsWith("07") || phone.startsWith("01"));
      const isTwelveDigit = phone.length === 12 && (phone.startsWith("2547") || phone.startsWith("2541"));

      if (!isTenDigit && !isTwelveDigit) {
        notify({
          type: "WARNING",
          title: "Invalid M-Pesa Number",
          message: "Please enter a valid 10-digit M-Pesa phone number (e.g. 0712345678 or 0112345678).",
        });
        return;
      }
    }

    setIsCheckingOut(true);
    try {
      const payload = {
        customerName: currentUser.displayName || "Online Customer",
        customerEmail: currentUser.email || undefined,
        customerPhone: mpesaPhone.trim() || undefined,
        paymentMethod,
        paymentReference: `MPESA-STK-${mpesaPhone.trim()}-${Date.now().toString().slice(-6)}`,
        items: cart.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          sku: i.sku,
          school: i.school,
          size: i.size,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };

      const res = await api.checkoutPortal(payload);
      setCompletedSale(res.sale);
      setCompletedReceipt(res.receipt);
      setCompletedQrCode(res.qrCodeDataUrl || res.sale?.kraQrCodeUrl || "");
      setIsReceiptModalOpen(true);
      setCart([]);
      setMpesaPhone("");

      notify({
        type: "SUCCESS",
        title: "Order Placed Successfully!",
        message: `Official KRA Receipt ${res.sale.receiptNumber} generated. Thank you!`,
      });
    } catch (err: any) {
      notify({
        type: "ERROR",
        title: "Checkout Error",
        message: err.message || "Could not complete order. Please try again.",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-slate-900 flex flex-col font-sans select-none">
      {/* ==================================================== */}
      {/* TALL HEADER WITH CURVED SINGLE WAVE BOTTOM EDGE      */}
      {/* ==================================================== */}
      <header className="w-full relative bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0412B3] text-white shadow-md">
        {/* Double-height Inner Content Bar */}
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-4 sm:pt-12 sm:pb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3.5 sm:space-x-5">
            <img
              src="https://plain-eeur-prod-public.komododecks.com/202605/07/1sm3ITZIdJmYjyTcxmiP/image.png"
              alt="Naisia Textiles Logo"
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-md rounded-2xl bg-white/10 p-1 ring-2 ring-[#FACB00]/40"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white leading-none drop-shadow-sm">
                  NAISIAE TEXTILES
                </h1>
                <span className="bg-[#FACB00] text-[#030A91] text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-sm">
                  Customer POS Portal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 font-medium mt-1">
                Official School Uniforms & Corporate Garments Self-Service Checkout
              </p>
              <p className="text-[10px] text-[#FACB00]/90 font-mono tracking-wider uppercase mt-0.5">
                Instant Google Sign-In • KRA eTIMS Fiscalized Receipts
              </p>
            </div>
          </div>

          {/* Right Header Controls: Google User Profile & ERP Portal Link */}
          <div className="flex items-center space-x-2.5 self-start md:self-center shrink-0">
            {/* Google Authentication Box */}
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-white/15 backdrop-blur-sm px-3 py-2 rounded-2xl border border-white/20 shadow-sm">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-[#FACB00]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#FACB00] text-[#030A91] flex items-center justify-center font-black text-xs">
                    {(currentUser.displayName || currentUser.email || "C")[0].toUpperCase()}
                  </div>
                )}
                <div className="text-left text-xs leading-tight">
                  <p className="font-bold text-white truncate max-w-[140px]">
                    {currentUser.displayName || "Google Customer"}
                  </p>
                  <p className="text-[10px] text-blue-200 truncate max-w-[140px]">
                    {currentUser.email}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors ml-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthLoading}
                className="inline-flex items-center space-x-2 bg-white text-slate-900 hover:bg-slate-100 px-4 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isAuthLoading ? "Signing In..." : "Sign in with Google"}</span>
              </button>
            )}

            {/* ERP Staff Portal Link */}
            <a
              href="/erp"
              className="inline-flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2.5 rounded-2xl text-xs font-bold transition-colors"
              title="Staff & Management Login"
            >
              <Lock className="w-3.5 h-3.5 text-[#FACB00]" />
              <span className="hidden sm:inline">Staff / ERP</span>
            </a>
          </div>
        </div>

        {/* SINGLE WAVE CURVED BOTTOM EDGE */}
        <div className="w-full leading-none overflow-hidden select-none -mb-[1px]">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-8 sm:h-16 md:h-20 block"
            preserveAspectRatio="none"
          >
            {/* Subtle Golden Accent Wave shadow behind */}
            <path
              d="M0,20 C360,95 1080,-10 1440,65 L1440,120 L0,120 Z"
              fill="#FACB00"
              fillOpacity="0.25"
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
      {/* MOBILE SWITCHER: CATALOG VS CART                    */}
      {/* ==================================================== */}
      <div className="lg:hidden p-2 bg-slate-200/90 shadow-inner select-none flex space-x-1.5">
        <button
          onClick={() => setMobileTab("catalog")}
          className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 transition-all ${
            mobileTab === "catalog" ? "bg-[#030A91] text-white shadow-sm" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <Shirt className="w-4 h-4 text-[#FACB00]" />
          <span>Uniform Catalog ({filteredProducts.length})</span>
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 transition-all ${
            mobileTab === "cart" ? "bg-[#030A91] text-white shadow-sm" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-[#FACB00]" />
          <span>Cart ({totalQuantity})</span>
          {totalAmount > 0 && (
            <span className="bg-[#FACB00] text-[#030A91] px-1.5 py-0.2 rounded-full font-black text-[10px]">
              KES {totalAmount.toLocaleString()}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================== */}
      {/* MAIN CONTENT: POS LAYOUT WITH CATALOG & CART         */}
      {/* ==================================================== */}
      <main className="max-w-7xl mx-auto w-full px-4 py-4 sm:py-6 pb-28 md:pb-32 flex-1 flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT COLUMN: FILTERS & PRODUCT GRID */}
        <section
          className={`flex-1 flex flex-col space-y-4 w-full min-w-0 ${
            mobileTab === "catalog" ? "block" : "hidden lg:flex"
          }`}
        >
          {/* Search & School Filters Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search uniform name, school, color, SKU..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* School Selector */}
              <div className="w-full sm:w-64">
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                >
                  <option value="ALL">🏫 All Institutions & Schools</option>
                  {schools.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Horizontally Scrollable Category Menu Below Search */}
            <div className="relative group/menu pt-1">
              {/* Left Scroll Button */}
              <button
                type="button"
                onClick={() => scrollCategories("left")}
                aria-label="Scroll left"
                className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white hover:bg-slate-50 border border-slate-300 rounded-full shadow-md items-center justify-center text-slate-700 hover:text-[#030A91] transition-all cursor-pointer opacity-90 hover:opacity-100 hover:scale-110"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Scrollable Container with wheel & drag support */}
              <div
                ref={categoryScrollRef}
                onWheel={(e) => {
                  if (e.deltaY !== 0 && categoryScrollRef.current) {
                    categoryScrollRef.current.scrollLeft += e.deltaY;
                  }
                }}
                className="flex items-center space-x-2 overflow-x-auto pb-2 pt-0.5 px-0.5 scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing text-xs [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
              >
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap text-xs transition-all cursor-pointer select-none ${
                      selectedCategory === c
                        ? "bg-[#030A91] text-white shadow-xs scale-[1.02]"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {c === "ALL" ? "All Garments" : c}
                  </button>
                ))}
              </div>

              {/* Right Scroll Button */}
              <button
                type="button"
                onClick={() => scrollCategories("right")}
                aria-label="Scroll right"
                className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white hover:bg-slate-50 border border-slate-300 rounded-full shadow-md items-center justify-center text-slate-700 hover:text-[#030A91] transition-all cursor-pointer opacity-90 hover:opacity-100 hover:scale-110"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#030A91]" />
              <p className="font-bold">Loading Naisiae uniform collection...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500 space-y-2">
              <Shirt className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-800">No matching garments found</p>
              <p className="text-slate-400">Try adjusting your search or selecting another institution.</p>
              <button
                onClick={() => {
                  setSelectedSchool("ALL");
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                }}
                className="mt-2 text-[#030A91] font-bold underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map((p) => {
                const variants = p.variants || [];
                const minPrice = variants.length ? Math.min(...variants.map((v) => v.sellingPrice)) : 0;
                const maxPrice = variants.length ? Math.max(...variants.map((v) => v.sellingPrice)) : 0;
                const hasMultiplePrices = minPrice !== maxPrice && maxPrice > 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveProductForVariant(p)}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-[#030A91] hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden group text-left"
                  >
                    {/* Image Box */}
                    <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      <img
                        src={normalizeImageUrl(p.imageUrl)}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/logo.png";
                        }}
                      />
                      <span className="absolute top-2 left-2 bg-[#030A91]/80 backdrop-blur-xs text-[#FACB00] text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs truncate max-w-[85%]">
                        {p.school}
                      </span>
                      {p.category && (
                        <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          {p.category}
                        </span>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h3 className="font-black text-xs text-slate-900 group-hover:text-[#030A91] line-clamp-2 leading-tight">
                          {p.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          {variants.length} {variants.length === 1 ? "size variant" : "sizes available"}
                        </p>
                      </div>

                      <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold uppercase">Price</span>
                          <span className="text-xs font-black text-[#030A91]">
                            KES {minPrice.toLocaleString()} {hasMultiplePrices && `+`}
                          </span>
                        </div>
                        <span className="bg-blue-50 text-[#030A91] group-hover:bg-[#030A91] group-hover:text-white px-2 py-1 rounded-lg text-[10px] font-bold transition-colors">
                          Select &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: POS-STYLE CART & CHECKOUT TERMINAL     */}
        {/* ==================================================== */}
        <aside
          className={`w-full lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-lg p-4 sm:p-5 flex flex-col space-y-4 shrink-0 ${
            mobileTab === "cart" ? "block" : "hidden lg:flex"
          }`}
        >
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-[#030A91]" />
              <h2 className="font-black text-sm text-slate-900">Your Shopping Cart</h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Customer Profile Banner */}
          <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
            {currentUser ? (
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#030A91] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {(currentUser.displayName || "C")[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {currentUser.displayName || "Google Customer"}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-0.5 inline" /> Verified Customer
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div>
                  <p className="text-xs font-bold text-slate-800">Checkout as Guest / Sign In</p>
                  <p className="text-[10px] text-slate-500">Sign in with Google for instant eTIMS receipt</p>
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  className="bg-[#030A91] text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg hover:bg-blue-900 cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Cart Items List - shows 2 items by default, rest collapsed */}
          <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2.5 pr-1 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">Your cart is empty</p>
                <p className="text-[11px] text-slate-400">Select any garment from the catalog to add sizes</p>
              </div>
            ) : (
              <>
                {(isCartExpanded ? cart : cart.slice(0, 2)).map((item) => (
                  <div key={item.variantId} className="pt-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-slate-900 truncate leading-tight">
                        {item.productName}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Size {item.size} • <span className="font-mono">{item.sku}</span>
                      </p>
                      <p className="text-xs font-black text-[#030A91] mt-0.5">
                        KES {(item.unitPrice * item.quantity).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => updateQuantity(item.variantId, -1)}
                        className="p-1 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-xs px-1.5 text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.variantId, 1)}
                        className="p-1 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length > 2 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCartExpanded(!isCartExpanded)}
                      className="w-full py-2 px-3 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 rounded-xl text-[11px] font-bold text-[#030A91] flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <span>
                        {isCartExpanded
                          ? "Collapse extra items"
                          : `+ Show ${cart.length - 2} more item${cart.length - 2 > 1 ? "s" : ""} in cart`}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isCartExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Order Summary & Pricing */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Items count:</span>
              <span className="font-bold text-slate-800">{totalQuantity} units</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>KRA 16% VAT (Inclusive):</span>
              <span className="font-mono text-slate-700">KES {vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-100">
              <span>Total Payable:</span>
              <span className="text-[#030A91]">KES {totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Payment Method:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("MPESA")}
                className={`p-2.5 rounded-xl border-2 text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  paymentMethod === "MPESA"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>M-PESA</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`p-2.5 rounded-xl border-2 text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  paymentMethod === "CARD"
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Card / Visa</span>
              </button>
            </div>

            {paymentMethod === "MPESA" && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-700">M-Pesa Mobile Number</span>
                  <span
                    className={`font-mono font-bold ${
                      mpesaPhone.length === 10 || (mpesaPhone.startsWith("254") && mpesaPhone.length === 12)
                        ? "text-emerald-700 font-black"
                        : "text-slate-400"
                    }`}
                  >
                    {mpesaPhone.length} / {mpesaPhone.startsWith("254") ? "12 digits" : "10 digits"}
                  </span>
                </div>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={mpesaPhone.startsWith("254") ? 12 : 10}
                    value={mpesaPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const max = digits.startsWith("254") ? 12 : 10;
                      setMpesaPhone(digits.slice(0, max));
                    }}
                    placeholder="e.g. 0712345678 or 0112345678"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all tracking-wider"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Strictly 10 digits (e.g. 0712345678). Letters & symbols are automatically blocked.
                </p>
              </div>
            )}
          </div>

          {/* Complete Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className="w-full py-3.5 rounded-2xl bg-[#030A91] hover:bg-blue-900 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider shadow-md disabled:opacity-50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isCheckingOut ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#FACB00]" />
                <span>Processing & Fiscalizing eTIMS...</span>
              </>
            ) : !currentUser ? (
              <>
                <span>Sign in with Google to Checkout</span>
                <ArrowRight className="w-4 h-4 text-[#FACB00]" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#FACB00]" />
                <span>Pay & Complete Order • KES {totalAmount.toLocaleString()}</span>
              </>
            )}
          </button>
        </aside>
      </main>

      {/* ==================================================== */}
      {/* BRIGHT GREY DESKTOP BOTTOM NAV WITH QUICK MENU & TOTAL */}
      {/* ==================================================== */}
      <nav className="hidden md:block fixed bottom-0 left-0 right-0 z-40 bg-[#F1F5F9] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        {/* Top Edge Yellow Gradient Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#D9A700] via-[#FACB00] via-[#FFE57F] to-[#E5B800] shadow-xs" />
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Left: Quick Menu & Customer Badge */}
          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0">
            {/* Quick Menu Buttons */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedSchool("ALL");
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:text-[#030A91] transition-all shadow-2xs cursor-pointer"
                title="View All Uniforms & Reset Filters"
              >
                <Shirt className="w-3.5 h-3.5 text-[#030A91]" />
                <span>All Catalog</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 120, behavior: "smooth" });
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:text-[#030A91] transition-all shadow-2xs cursor-pointer"
                title="Filter by School or Institution"
              >
                <Building className="w-3.5 h-3.5 text-[#030A91]" />
                <span>Institutions</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cartEl = document.querySelector("aside");
                  if (cartEl) cartEl.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:text-[#030A91] transition-all shadow-2xs cursor-pointer"
                title="View Cart"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#030A91]" />
                <span>Cart ({totalQuantity})</span>
              </button>

              <a
                href="/erp"
                className="hidden xl:flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 hover:text-[#030A91] transition-all shadow-2xs"
                title="ERP Staff Access"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Staff Portal</span>
              </a>
            </div>

            {/* User status info */}
            {currentUser && (
              <div className="hidden lg:flex items-center space-x-1.5 pl-2 border-l border-slate-300 text-xs text-slate-600 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate max-w-[160px] font-medium">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
            )}
          </div>

          {/* Right: Big Bold Total Checkout Amount & Action Button */}
          <div className="flex items-center space-x-5 lg:space-x-6 shrink-0">
            {/* Total Amount Display - Big & Bold */}
            <div className="text-right">
              <span className="text-[10px] lg:text-xs font-black uppercase tracking-wider text-slate-500 block">
                Total Checkout Amount
              </span>
              <div className="flex items-baseline space-x-1.5 justify-end">
                <span className="text-sm lg:text-base font-extrabold text-[#030A91]">KES</span>
                <span className="text-2xl lg:text-4xl font-black text-[#030A91] tracking-tight leading-none font-mono">
                  {totalAmount.toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-bold">
                {totalQuantity} {totalQuantity === 1 ? "garment selected" : "garments selected"}
              </span>
            </div>

            {/* Direct Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
              className="py-3 px-5 lg:px-7 rounded-2xl bg-[#030A91] hover:bg-blue-900 active:scale-95 text-white font-black text-xs lg:text-sm uppercase tracking-wider shadow-md transition-all flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isCheckingOut ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FACB00]" />
                  <span>Processing...</span>
                </>
              ) : !currentUser ? (
                <>
                  <span>Sign In & Pay</span>
                  <ArrowRight className="w-4 h-4 text-[#FACB00]" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#FACB00]" />
                  <span>Complete Checkout</span>
                </>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ==================================================== */}
      {/* SIZE VARIANT SELECTION MODAL                        */}
      {/* ==================================================== */}
      {activeProductForVariant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#FACB00]">
                  {activeProductForVariant.school}
                </span>
                <h3 className="font-black text-sm leading-tight">
                  {activeProductForVariant.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveProductForVariant(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Your Required Uniform Size:
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {activeProductForVariant.variants.map((v) => {
                  const stock = Object.values(v.branchStock || {}).reduce((a, b) => Number(a) + Number(b), 0);
                  const isAvailable = stock > 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => handleAddToCart(activeProductForVariant, v)}
                      className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-[#030A91] hover:bg-blue-50/50 transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-900 group-hover:text-[#030A91]">
                            Size {v.size}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({v.sku})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 mt-0.5 block">
                          In Stock ({stock} units)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-[#030A91] block">
                          KES {v.sellingPrice.toLocaleString()}
                        </span>
                        <span className="inline-block bg-[#FACB00] text-[#030A91] text-[10px] font-black px-2 py-0.5 rounded-md mt-1 group-hover:scale-105 transition-transform">
                          Add to Cart +
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Thermal Receipt & eTIMS QR Modal */}
      <ReceiptModal
        sale={completedSale}
        receipt={completedReceipt}
        qrCodeDataUrl={completedQrCode}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
};
