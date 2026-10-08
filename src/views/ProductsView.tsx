import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api';
import { Product, ProductVariant } from '../types';
import {
  Tag,
  Plus,
  Search,
  Filter,
  Edit3,
  Check,
  X,
  Barcode,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  Store,
  Layers,
  Sparkles,
  Camera,
  Percent,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
  Calculator,
  GraduationCap,
  Briefcase,
  Shirt,
  Shield,
  BookOpen,
  Award
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ProductPriceSetModal } from '../components/ProductPriceSetModal';
import {
  INVENTORY_SECTORS,
  COLLEGE_INSTITUTIONS,
  PROFESSIONAL_DOMAINS,
  InventorySectorId,
  CollegeInstitution,
  ProfessionalDomain,
  getSectorById,
  getAvailableGarments
} from '../constants/uniformCategories';

// Helper to normalize web URLs and Google Drive links into direct thumbnail images
export const normalizeImageUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();

  // 1. Google Drive file link: drive.google.com/file/d/FILE_ID/view...
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1000`;
  }

  // 2. drive.google.com/open?id=FILE_ID
  const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w1000`;
  }

  // 3. drive.google.com/uc?id=FILE_ID
  const ucMatch = trimmed.match(/drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
  if (ucMatch && ucMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w1000`;
  }

  return trimmed;
};

export const ProductsView: React.FC = () => {
  const { canAccessFinancials, branches } = useAuth();
  const { notify } = useNotification();

  const [products, setProducts] = useState<Product[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState<'ALL' | InventorySectorId>('ALL');
  const [selectedCollegeInst, setSelectedCollegeInst] = useState<string>('ALL');
  const [selectedProfDomain, setSelectedProfDomain] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // New Product Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSchool, setCreateSchool] = useState('Nairobi School');
  const [createSector, setCreateSector] = useState<InventorySectorId>('SECONDARY');
  const [createInstitutionType, setCreateInstitutionType] = useState<string>('KMTC');
  const [createProfessionalDomain, setCreateProfessionalDomain] = useState<ProfessionalDomain>('Security');
  const [createGarmentType, setCreateGarmentType] = useState<string>('Shirts');
  const [createCategory, setCreateCategory] = useState<string>('Shirts');
  const [createGender, setCreateGender] = useState<any>('UNISEX');
  const [createDescription, setCreateDescription] = useState('');
  const [createTaxCategory, setCreateTaxCategory] = useState<'VAT_16' | 'ZERO_RATED'>('VAT_16');
  const [createBaseCost, setCreateBaseCost] = useState(600);
  const [createBasePrice, setCreateBasePrice] = useState(1000);
  const [createSizesInput, setCreateSizesInput] = useState('26, 28, 30, 32, 34, 36');
  const [createImageUrl, setCreateImageUrl] = useState('');
  const [createImageInputMode, setCreateImageInputMode] = useState<'upload' | 'link'>('upload');

  // Edit Product Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editSector, setEditSector] = useState<InventorySectorId>('SECONDARY');
  const [editInstitutionType, setEditInstitutionType] = useState<string>('');
  const [editProfessionalDomain, setEditProfessionalDomain] = useState<string>('');
  const [editGarmentType, setEditGarmentType] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('Shirts');
  const [editGender, setEditGender] = useState<any>('UNISEX');
  const [editDescription, setEditDescription] = useState('');
  const [editTaxCategory, setEditTaxCategory] = useState<'VAT_16' | 'ZERO_RATED'>('VAT_16');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageInputMode, setEditImageInputMode] = useState<'upload' | 'link'>('upload');
  const [editActive, setEditActive] = useState(true);
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([]);
  const [newVariantSize, setNewVariantSize] = useState('');
  const [newVariantCost, setNewVariantCost] = useState(600);
  const [newVariantPrice, setNewVariantPrice] = useState(1000);

  const fileInputCreateRef = useRef<HTMLInputElement>(null);
  const fileInputEditRef = useRef<HTMLInputElement>(null);

  // Batch Price Set Modal States
  const [isPriceSetModalOpen, setIsPriceSetModalOpen] = useState(false);
  const [priceSetSchool, setPriceSetSchool] = useState('ALL');
  const [priceSetSector, setPriceSetSector] = useState<string>('ALL');
  const [priceSetInstitutionType, setPriceSetInstitutionType] = useState<string>('ALL');
  const [priceSetProfessionalDomain, setPriceSetProfessionalDomain] = useState<string>('ALL');
  const [priceSetCategory, setPriceSetCategory] = useState('ALL');
  const [priceSetStrategy, setPriceSetStrategy] = useState<'PERCENTAGE' | 'FIXED_AMOUNT' | 'SET_BASE'>('PERCENTAGE');
  const [priceSetPercentage, setPriceSetPercentage] = useState(10);
  const [priceSetFixedAmount, setPriceSetFixedAmount] = useState(100);
  const [priceSetTargetPrice, setPriceSetTargetPrice] = useState(1200);
  const [priceSetRoundTo, setPriceSetRoundTo] = useState<number>(10);
  const [isApplyingPriceSet, setIsApplyingPriceSet] = useState(false);

  // Single Product Price Set Modal
  const [isSinglePriceSetModalOpen, setIsSinglePriceSetModalOpen] = useState(false);
  const [priceSetSelectedProduct, setPriceSetSelectedProduct] = useState<Product | null>(null);

  // Single Product Quick Price Set state inside Edit Modal
  const [quickSetPriceInput, setQuickSetPriceInput] = useState<string>('');

  const handleSelectCreateSector = (sec: InventorySectorId) => {
    setCreateSector(sec);
    const garments = getAvailableGarments(sec, createProfessionalDomain);
    if (garments.length > 0) {
      setCreateGarmentType(garments[0]);
      setCreateCategory(garments[0]);
    }
    if (sec === 'PRE_PRIMARY') {
      setCreateSizesInput('18, 20, 22, 24, 26');
      setCreateSchool('Pre-Primary / ECDE');
      setCreateBaseCost(350);
      setCreateBasePrice(650);
    } else if (sec === 'PRIMARY') {
      setCreateSizesInput('24, 26, 28, 30, 32, 34');
      setCreateSchool('Primary Schools');
      setCreateBaseCost(450);
      setCreateBasePrice(850);
    } else if (sec === 'JUNIOR_SECONDARY') {
      setCreateSizesInput('28, 30, 32, 34, 36, 38');
      setCreateSchool('Junior Secondary CBC');
      setCreateBaseCost(650);
      setCreateBasePrice(1200);
    } else if (sec === 'SECONDARY') {
      setCreateSizesInput('28, 30, 32, 34, 36, 38, 40');
      setCreateSchool('Secondary Schools');
      setCreateBaseCost(750);
      setCreateBasePrice(1350);
    } else if (sec === 'COLLEGE_UNIVERSITY') {
      setCreateSizesInput('S, M, L, XL, XXL, 3XL');
      setCreateSchool('KMTC');
      setCreateInstitutionType('KMTC');
      setCreateBaseCost(950);
      setCreateBasePrice(1650);
    } else if (sec === 'SERVICE_PROFESSIONAL') {
      setCreateSizesInput('S, M, L, XL, XXL, 3XL');
      setCreateSchool('Professional Services');
      setCreateProfessionalDomain('Security');
      setCreateBaseCost(850);
      setCreateBasePrice(1500);
    } else if (sec === 'ACCESSORIES') {
      setCreateSizesInput('Standard');
      setCreateSchool('General Accessories');
      setCreateBaseCost(150);
      setCreateBasePrice(350);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const [pList, sList] = await Promise.all([api.getProducts(), api.getSchools()]);
      setProducts(pList);
      setSchools(sList);
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Load Error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle File Upload from Drive or Local Computer
  const handleFileUpload = (file: File, isEdit: boolean) => {
    if (!file.type.startsWith('image/')) {
      notify({ type: 'WARNING', title: 'Invalid File', message: 'Please select a valid image file (PNG, JPG, WEBP)' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notify({ type: 'WARNING', title: 'File Too Large', message: 'Image size should be below 8MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (isEdit) {
        setEditImageUrl(dataUrl);
      } else {
        setCreateImageUrl(dataUrl);
      }
      notify({ type: 'SUCCESS', title: 'Image Loaded', message: `${file.name} ready for saving.` });
    };
    reader.readAsDataURL(file);
  };

  // Open Edit Modal for a Product
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditSchool(product.school);
    setEditSector(product.sector || 'SECONDARY');
    setEditInstitutionType(product.institutionType || '');
    setEditProfessionalDomain(product.professionalDomain || '');
    setEditGarmentType(product.garmentType || product.category);
    setEditCategory(product.category);
    setEditGender(product.gender);
    setEditDescription(product.description || '');
    setEditTaxCategory((product.taxCategory as any) || 'VAT_16');
    setEditImageUrl(product.imageUrl || '');
    setEditActive(product.active);
    setEditVariants(JSON.parse(JSON.stringify(product.variants || [])));
    setNewVariantSize('');
    setIsEditModalOpen(true);
  };

  // Handle Update Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const normalizedImg = normalizeImageUrl(editImageUrl);
      const updated = await api.updateProduct(editingProduct.id, {
        name: editName,
        school: editSchool,
        sector: editSector,
        institutionType: editInstitutionType || undefined,
        professionalDomain: editProfessionalDomain || undefined,
        garmentType: editCategory,
        category: editCategory,
        gender: editGender,
        description: editDescription,
        taxCategory: editTaxCategory,
        imageUrl: normalizedImg,
        active: editActive,
        variants: editVariants,
      });

      notify({
        type: 'SUCCESS',
        title: 'Product Updated',
        message: `${editName} catalog specifications and images saved successfully.`,
      });

      setIsEditModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Update Failed', message: err.message || 'Could not update product' });
    }
  };

  // Handle Global or School-wide Batch Price Set
  const handleApplyPriceSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsApplyingPriceSet(true);
    try {
      const res = await api.applyPriceSet({
        school: priceSetSchool !== 'ALL' ? priceSetSchool : undefined,
        category: priceSetCategory !== 'ALL' ? priceSetCategory : undefined,
        sector: priceSetSector !== 'ALL' ? priceSetSector : undefined,
        institutionType: priceSetInstitutionType !== 'ALL' ? priceSetInstitutionType : undefined,
        professionalDomain: priceSetProfessionalDomain !== 'ALL' ? priceSetProfessionalDomain : undefined,
        garmentType: priceSetCategory !== 'ALL' ? priceSetCategory : undefined,
        adjustmentType: priceSetStrategy,
        percentage: priceSetPercentage,
        fixedAmount: priceSetFixedAmount,
        targetPrice: priceSetTargetPrice,
        roundTo: priceSetRoundTo,
      });

      notify({
        type: 'SUCCESS',
        title: 'Price Set Applied',
        message: `Updated prices for ${res.updatedCount} products (${res.variantsUpdated} size variants).`,
      });

      setIsPriceSetModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Price Set Failed', message: err.message || 'Could not apply price set' });
    } finally {
      setIsApplyingPriceSet(false);
    }
  };

  // Handle Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const sizes = createSizesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!sizes.length) {
      notify({ type: 'WARNING', title: 'Sizes Required', message: 'Enter at least one size variant' });
      return;
    }

    const variants = sizes.map((size) => ({
      size,
      color: 'Standard',
      costPrice: createBaseCost,
      sellingPrice: createBasePrice,
      reorderLevel: 10,
      reorderQuantity: 30,
    }));

    try {
      const normalizedImg = normalizeImageUrl(createImageUrl);
      await api.createProduct({
        name: createName,
        school: createSchool,
        category: createCategory,
        gender: createGender,
        description: createDescription,
        taxCategory: createTaxCategory,
        imageUrl: normalizedImg,
        variants,
      });

      notify({
        type: 'SUCCESS',
        title: 'Product Created',
        message: `Added ${createName} with ${sizes.length} size variants and image.`,
      });

      setIsCreateModalOpen(false);
      setCreateName('');
      setCreateDescription('');
      setCreateImageUrl('');
      fetchProducts();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Creation Failed', message: err.message });
    }
  };

  // Handle Variant Price Update inside Edit Modal
  const handleVariantPriceChange = (variantId: string, field: 'sellingPrice' | 'costPrice' | 'reorderLevel', value: number) => {
    setEditVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [field]: value } : v))
    );
  };

  // Handle Adding a new size variant inside Edit Modal
  const handleAddNewVariant = () => {
    if (!newVariantSize.trim()) {
      notify({ type: 'WARNING', title: 'Size Required', message: 'Please specify size (e.g. 38, 40, XL)' });
      return;
    }

    const branchStock: Record<string, number> = {};
    branches.forEach((b) => {
      branchStock[b.id] = 0;
    });

    const newV: ProductVariant = {
      id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sku: `SKU-${Date.now()}`,
      barcode: `616${Math.floor(100000000 + Math.random() * 900000000)}`,
      size: newVariantSize.trim(),
      color: 'Standard',
      costPrice: Number(newVariantCost) || 0,
      sellingPrice: Number(newVariantPrice) || 0,
      branchStock,
      reorderLevel: 10,
      reorderQuantity: 30,
    };

    setEditVariants((prev) => [...prev, newV]);
    setNewVariantSize('');
    notify({ type: 'SUCCESS', title: 'Size Added', message: `Added Size ${newV.size} variant.` });
  };

  // Handle Removing variant inside Edit Modal
  const handleRemoveVariant = (variantId: string) => {
    if (editVariants.length <= 1) {
      notify({ type: 'WARNING', title: 'Cannot Delete', message: 'Product must have at least one size variant' });
      return;
    }
    setEditVariants((prev) => prev.filter((v) => v.id !== variantId));
  };

  const filtered = products.filter((p) => {
    if (selectedSchool !== 'ALL' && p.school !== selectedSchool) return false;
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.school.toLowerCase().includes(q) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q) || v.barcode.includes(q))
      );
    }
    return true;
  });

  const priceSetAvailableGarments = React.useMemo(() => {
    if (priceSetSector === 'ALL') {
      const all = new Set<string>();
      INVENTORY_SECTORS.forEach((s) => s.garments.forEach((g) => all.add(g)));
      return Array.from(all);
    }
    return getAvailableGarments(
      priceSetSector as InventorySectorId,
      priceSetProfessionalDomain !== 'ALL' ? (priceSetProfessionalDomain as any) : undefined
    );
  }, [priceSetSector, priceSetProfessionalDomain]);

  // Uniform categories list for the products catalog filter
  const availableCategoriesList = React.useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Available garments for Create Modal
  const createAvailableGarments = React.useMemo(() => {
    return getAvailableGarments(createSector, createProfessionalDomain);
  }, [createSector, createProfessionalDomain]);

  // Available garments for Edit Modal
  const editAvailableGarments = React.useMemo(() => {
    return getAvailableGarments(editSector, editProfessionalDomain as any);
  }, [editSector, editProfessionalDomain]);

  const matchingBatchProducts = products.filter((p) => {
    if (priceSetSector !== 'ALL' && p.sector && p.sector !== priceSetSector) return false;
    if (priceSetSchool !== 'ALL' && p.school.toLowerCase() !== priceSetSchool.toLowerCase()) return false;
    if (priceSetInstitutionType !== 'ALL' && p.institutionType !== priceSetInstitutionType) return false;
    if (priceSetProfessionalDomain !== 'ALL' && p.professionalDomain !== priceSetProfessionalDomain) return false;
    if (priceSetCategory !== 'ALL') {
      const targetCat = priceSetCategory.toLowerCase();
      const pCat = p.category?.toLowerCase() || '';
      const pGarm = p.garmentType?.toLowerCase() || '';
      if (pCat !== targetCat && pGarm !== targetCat) return false;
    }
    return true;
  });

  const matchingVariantsCount = matchingBatchProducts.reduce(
    (acc, p) => acc + (p.variants?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            School Uniform Master Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage school garments, size specifications, product imagery from Drive or links, and pricing.
          </p>
        </div>

        {canAccessFinancials && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPriceSetModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2 bg-white hover:bg-slate-50 text-[#030A91] border-2 border-[#030A91] rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <SlidersHorizontal className="w-4 h-4 mr-1.5 text-[#030A91]" />
              <span>Batch Price Set</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5 text-[#FACB00]" />
              <span>Add New Uniform Item</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search uniform catalog by name, school, SKU, size..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">All Schools</option>
            {schools.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="ALL">All Uniform Categories ({availableCategoriesList.length})</option>
            {availableCategoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
          >
            <div>
              {/* Product Image Banner */}
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden border-b border-slate-100 flex items-center justify-center">
                {prod.imageUrl ? (
                  <img
                    src={normalizeImageUrl(prod.imageUrl)}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#030A91] mx-auto flex items-center justify-center mb-1">
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">No Image Uploaded</span>
                  </div>
                )}

                {/* Badges on Image */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/95 text-slate-800 shadow-xs backdrop-blur-xs">
                    {prod.school}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#030A91] text-white shadow-xs">
                    {prod.taxCategory === 'VAT_16' ? '16% VAT' : 'Zero Rated'}
                  </span>
                </div>

                {/* Edit Button overlay on image */}
                {canAccessFinancials && (
                  <button
                    onClick={() => handleOpenEditModal(prod)}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 hover:bg-[#030A91] text-slate-700 hover:text-white shadow-md transition-all"
                    title="Edit Product & Image"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Product Info */}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {prod.category} • {prod.gender}
                  </span>
                  <StatusBadge status={prod.active ? 'ACTIVE' : 'INACTIVE'} />
                </div>

                <h3 className="font-extrabold text-sm text-slate-900 mt-1 leading-snug">
                  {prod.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {prod.description || 'Uniform tailored to school curriculum standards.'}
                </p>

                {/* Sizes breakdown table */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 pb-1">
                    <span>Size Variant</span>
                    <span>Cost / Retail</span>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {prod.variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex justify-between items-center text-xs p-1.5 rounded-lg bg-slate-50 font-mono"
                      >
                        <span className="font-bold text-slate-800">Size {v.size}</span>
                        <div className="text-right">
                          {canAccessFinancials && (
                            <span className="text-slate-400 text-[10px] mr-2">
                              (c: {v.costPrice})
                            </span>
                          )}
                          <span className="font-bold text-[#030A91]">
                            KES {v.sellingPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Edit and Price Set Actions */}
            <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">
                {prod.variants.length} sizes active
              </span>

              {canAccessFinancials && (
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      setPriceSetSelectedProduct(prod);
                      setIsSinglePriceSetModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1 font-bold text-[#030A91] bg-blue-50 hover:bg-[#030A91] hover:text-white px-2.5 py-1.5 rounded-xl transition-all shadow-xs border border-blue-200/60"
                    title="Set Prices for this product"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Price Set</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(prod)}
                    className="inline-flex items-center space-x-1 font-bold text-slate-700 hover:text-[#030A91] px-2 py-1.5 rounded-xl hover:bg-slate-200/60 transition-all"
                    title="Edit Product & Image"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================== */}
      {/* EDIT PRODUCT MODAL (WITH DRIVE / LINK IMAGE UPLOAD)   */}
      {/* ==================================================== */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-[#030A91] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-[#FACB00]" />
                <h3 className="font-black text-sm sm:text-base">
                  Edit Uniform Product: {editingProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Product Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Uniform Item Name:
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-[#030A91]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Partner School:
                  </label>
                  <input
                    type="text"
                    value={editSchool}
                    onChange={(e) => setEditSchool(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-[#030A91]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Category:
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => {
                      setEditCategory(e.target.value);
                      setEditGarmentType(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {editAvailableGarments.length > 0 ? (
                      editAvailableGarments.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))
                    ) : (
                      <option value={editCategory}>{editCategory}</option>
                    )}
                    {!editAvailableGarments.includes(editCategory) && (
                      <option value={editCategory}>{editCategory}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Gender:
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="UNISEX">Unisex</option>
                    <option value="BOYS">Boys</option>
                    <option value="GIRLS">Girls</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Tax Category:
                  </label>
                  <select
                    value={editTaxCategory}
                    onChange={(e) => setEditTaxCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="VAT_16">16% Standard VAT</option>
                    <option value="ZERO_RATED">0% Zero-Rated</option>
                  </select>
                </div>
              </div>

              {/* ==================================================== */}
              {/* IMAGE MANAGEMENT (UPLOAD FROM DRIVE / PC OR LINK)    */}
              {/* ==================================================== */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-[#030A91]" />
                    <span className="font-extrabold text-slate-800 text-xs">
                      Product Image (Upload from Computer / Drive or Link)
                    </span>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setEditImageInputMode('upload')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        editImageInputMode === 'upload'
                          ? 'bg-white text-[#030A91] shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditImageInputMode('link')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        editImageInputMode === 'link'
                          ? 'bg-white text-[#030A91] shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Web / Drive Link
                    </button>
                  </div>
                </div>

                {/* Image Preview Box */}
                {editImageUrl ? (
                  <div className="flex items-center space-x-4 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                      <img
                        src={normalizeImageUrl(editImageUrl)}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute(
                            'src',
                            'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=300&q=80'
                          );
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Image Attached
                      </span>
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-1">
                        {editImageUrl.startsWith('data:') ? 'Local file uploaded' : editImageUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditImageUrl('')}
                        className="mt-2 inline-flex items-center text-rose-600 hover:text-rose-800 text-[11px] font-bold"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        <span>Remove Image</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {editImageInputMode === 'upload' ? (
                      /* Mode A: Drag & Drop / File Input */
                      <div
                        onClick={() => fileInputEditRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-[#030A91] hover:bg-blue-50/30 rounded-xl p-4 text-center cursor-pointer transition-colors"
                      >
                        <input
                          ref={fileInputEditRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, true);
                          }}
                        />
                        <Upload className="w-6 h-6 text-[#030A91] mx-auto mb-1" />
                        <span className="font-bold text-slate-800 block text-xs">
                          Click to upload image from your Computer or Drive
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Supports PNG, JPG, WEBP up to 8MB
                        </span>
                      </div>
                    ) : (
                      /* Mode B: Paste Link / Google Drive */
                      <div className="space-y-1.5">
                        <div className="relative">
                          <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="url"
                            value={editImageUrl}
                            onChange={(e) => setEditImageUrl(e.target.value)}
                            placeholder="Paste Google Drive sharing link or web image URL..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#030A91]"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Tip: Paste any Google Drive link (e.g.{' '}
                          <code className="text-slate-700 bg-slate-200 px-1 rounded">
                            drive.google.com/file/d/.../view
                          </code>
                          ) and the ERP auto-converts it to a direct display image!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Description & Fabric Specifications:
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Fabric composition, weight, monogram embroidery details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  rows={2}
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Catalog Visibility Status</span>
                  <span className="text-[10px] text-slate-500">
                    Inactive products are hidden from POS retail checkouts.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                    editActive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {editActive ? 'Active in POS' : 'Inactive / Hidden'}
                </button>
              </div>

              {/* ==================================================== */}
              {/* SIZE VARIANTS & PRICING EDITING                      */}
              {/* ==================================================== */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-[#030A91]" />
                    <span className="font-extrabold text-slate-800 text-xs">
                      Size Variants & Pricing (KES)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {editVariants.length} Sizes Configured
                  </span>
                </div>

                {/* Quick Price Set Automation Bar */}
                <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#030A91] text-[11px] flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-[#FACB00]" />
                      Product Price Set Automation
                    </span>
                    <span className="text-[10px] text-slate-500">Quickly apply pricing across all sizes</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Flat Base Set */}
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        placeholder="Price KES"
                        value={quickSetPriceInput}
                        onChange={(e) => setQuickSetPriceInput(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Number(quickSetPriceInput);
                          if (val > 0) {
                            setEditVariants((prev) => prev.map((v) => ({ ...v, sellingPrice: val })));
                            notify({
                              type: 'SUCCESS',
                              title: 'Price Set Applied',
                              message: `Updated all sizes to KES ${val.toLocaleString()}`,
                            });
                          }
                        }}
                        className="px-2.5 py-1 bg-[#030A91] text-white rounded text-[10px] font-bold shrink-0 hover:bg-blue-900"
                      >
                        Set All
                      </button>
                    </div>

                    {/* Quick Percentage Adjustments */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditVariants((prev) =>
                            prev.map((v) => ({ ...v, sellingPrice: Math.round(v.sellingPrice * 1.05) }))
                          );
                          notify({ type: 'SUCCESS', title: 'Price Set Applied', message: 'Applied +5% adjustment' });
                        }}
                        className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-bold"
                      >
                        +5%
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditVariants((prev) =>
                            prev.map((v) => ({ ...v, sellingPrice: Math.round(v.sellingPrice * 1.1) }))
                          );
                          notify({ type: 'SUCCESS', title: 'Price Set Applied', message: 'Applied +10% adjustment' });
                        }}
                        className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-bold"
                      >
                        +10%
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditVariants((prev) =>
                            prev.map((v) => ({ ...v, sellingPrice: Math.round(v.sellingPrice * 0.95) }))
                          );
                          notify({ type: 'SUCCESS', title: 'Price Set Applied', message: 'Applied -5% tender discount' });
                        }}
                        className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-bold"
                      >
                        -5%
                      </button>
                    </div>

                    {/* Cost Markup Multipliers */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditVariants((prev) =>
                            prev.map((v) => ({
                              ...v,
                              sellingPrice: Math.round((v.costPrice || 600) * 1.35),
                            }))
                          );
                          notify({ type: 'SUCCESS', title: 'Price Set Applied', message: 'Applied +35% margin over cost' });
                        }}
                        className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold"
                      >
                        +35% Cost
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditVariants((prev) =>
                            prev.map((v) => ({
                              ...v,
                              sellingPrice: Math.round((v.costPrice || 600) * 1.5),
                            }))
                          );
                          notify({ type: 'SUCCESS', title: 'Price Set Applied', message: 'Applied +50% margin over cost' });
                        }}
                        className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold"
                      >
                        +50% Cost
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editVariants.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 rounded bg-[#030A91] text-[#FACB00] font-mono font-bold text-xs">
                          Size {v.size}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {v.sku}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">
                            Cost Price:
                          </label>
                          <input
                            type="number"
                            value={v.costPrice}
                            onChange={(e) =>
                              handleVariantPriceChange(v.id, 'costPrice', Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block">
                            Selling Price:
                          </label>
                          <input
                            type="number"
                            value={v.sellingPrice}
                            onChange={(e) =>
                              handleVariantPriceChange(v.id, 'sellingPrice', Number(e.target.value))
                            }
                            className="w-24 px-2 py-1 bg-blue-50 border border-blue-200 text-[#030A91] font-bold rounded font-mono text-xs"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(v.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors mt-3"
                          title="Remove size variant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Variant Row */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[80px]">
                    <label className="text-[9px] font-bold text-slate-600 uppercase block mb-0.5">
                      New Size:
                    </label>
                    <input
                      type="text"
                      value={newVariantSize}
                      onChange={(e) => setNewVariantSize(e.target.value)}
                      placeholder="e.g. 38, XL"
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[9px] font-bold text-slate-600 uppercase block mb-0.5">
                      Cost (KES):
                    </label>
                    <input
                      type="number"
                      value={newVariantCost}
                      onChange={(e) => setNewVariantCost(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[9px] font-bold text-slate-600 uppercase block mb-0.5">
                      Selling (KES):
                    </label>
                    <input
                      type="number"
                      value={newVariantPrice}
                      onChange={(e) => setNewVariantPrice(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddNewVariant}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    + Add Size
                  </button>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900 shadow-sm"
                >
                  Save Product & Image Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* NEW PRODUCT CREATION MODAL (WITH DRIVE / LINK UPLOAD) */}
      {/* ==================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="p-4 bg-[#030A91] text-white flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base">
                Add New School Uniform Product
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Uniform Item Name:
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Nairobi School Official Long-Sleeve Shirt"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Partner School:
                  </label>
                  <input
                    type="text"
                    value={createSchool}
                    onChange={(e) => setCreateSchool(e.target.value)}
                    placeholder="e.g. Nairobi School or General Uniform"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Category:
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => {
                      setCreateCategory(e.target.value);
                      setCreateGarmentType(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {createAvailableGarments.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Base Cost (KES):
                  </label>
                  <input
                    type="number"
                    value={createBaseCost}
                    onChange={(e) => setCreateBaseCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Base Selling (KES):
                  </label>
                  <input
                    type="number"
                    value={createBasePrice}
                    onChange={(e) => setCreateBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-[#030A91]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Tax Category:
                  </label>
                  <select
                    value={createTaxCategory}
                    onChange={(e) => setCreateTaxCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="VAT_16">16% Standard VAT</option>
                    <option value="ZERO_RATED">0% Zero-Rated</option>
                  </select>
                </div>
              </div>

              {/* Image Input for New Product */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center space-x-1">
                    <Camera className="w-3.5 h-3.5 text-[#030A91]" />
                    <span>Product Image (Upload from Drive/PC or Paste Link)</span>
                  </span>

                  <div className="flex items-center space-x-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCreateImageInputMode('upload')}
                      className={`px-2 py-0.5 rounded ${
                        createImageInputMode === 'upload' ? 'bg-white text-[#030A91]' : 'text-slate-600'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateImageInputMode('link')}
                      className={`px-2 py-0.5 rounded ${
                        createImageInputMode === 'link' ? 'bg-white text-[#030A91]' : 'text-slate-600'
                      }`}
                    >
                      Drive / Link
                    </button>
                  </div>
                </div>

                {createImageUrl ? (
                  <div className="flex items-center space-x-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <img
                      src={normalizeImageUrl(createImageUrl)}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg bg-slate-100 border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Image Attached
                      </span>
                      <button
                        type="button"
                        onClick={() => setCreateImageUrl('')}
                        className="block mt-1 text-rose-600 text-[10px] font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : createImageInputMode === 'upload' ? (
                  <div
                    onClick={() => fileInputCreateRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-[#030A91] rounded-xl p-3 text-center cursor-pointer bg-white"
                  >
                    <input
                      ref={fileInputCreateRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, false);
                      }}
                    />
                    <Upload className="w-5 h-5 text-[#030A91] mx-auto mb-1" />
                    <span className="font-bold text-slate-800 text-xs block">
                      Upload from Computer or Drive
                    </span>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={createImageUrl}
                    onChange={(e) => setCreateImageUrl(e.target.value)}
                    placeholder="Paste Google Drive link or web image URL..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Sizes to Auto-Generate (comma separated):
                </label>
                <input
                  type="text"
                  value={createSizesInput}
                  onChange={(e) => setCreateSizesInput(e.target.value)}
                  placeholder="24, 26, 28, 30, 32, 34, 36"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                  Description:
                </label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Fabric composition, weight, embroidery details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  rows={2}
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900"
                >
                  Save Uniform Catalog Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* BATCH PRICE SET & PRICING STRATEGIES MODAL          */}
      {/* ==================================================== */}
      {isPriceSetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-[#030A91] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#FACB00] text-[#030A91] flex items-center justify-center font-black">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    Product Price Set Manager
                  </h3>
                  <p className="text-[10px] text-blue-200">
                    Bulk update uniform retail prices across schools and categories
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPriceSetModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyPriceSet} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Scope Selection */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block">
                    1. Select Target Catalog Scope
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FACB00] text-[#030A91]">
                    {matchingBatchProducts.length} products ({matchingVariantsCount} sizes)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Inventory Sector:
                    </label>
                    <select
                      value={priceSetSector}
                      onChange={(e) => {
                        setPriceSetSector(e.target.value);
                        setPriceSetCategory('ALL');
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                    >
                      <option value="ALL">All Sectors & Categories</option>
                      {INVENTORY_SECTORS.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      School / Institution:
                    </label>
                    <select
                      value={priceSetSchool}
                      onChange={(e) => setPriceSetSchool(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                    >
                      <option value="ALL">All Schools & Institutions</option>
                      {schools.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {priceSetSector === 'COLLEGE_UNIVERSITY' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Institution Type:
                      </label>
                      <select
                        value={priceSetInstitutionType}
                        onChange={(e) => setPriceSetInstitutionType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                      >
                        <option value="ALL">All Higher Institutions</option>
                        {COLLEGE_INSTITUTIONS.map((inst) => (
                          <option key={inst} value={inst}>
                            {inst}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {priceSetSector === 'SERVICE_PROFESSIONAL' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Professional Domain:
                      </label>
                      <select
                        value={priceSetProfessionalDomain}
                        onChange={(e) => {
                          setPriceSetProfessionalDomain(e.target.value);
                          setPriceSetCategory('ALL');
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                      >
                        <option value="ALL">All Domains</option>
                        {PROFESSIONAL_DOMAINS.map((dom) => (
                          <option key={dom} value={dom}>
                            {dom}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={priceSetSector === 'ALL' || (priceSetSector !== 'COLLEGE_UNIVERSITY' && priceSetSector !== 'SERVICE_PROFESSIONAL') ? 'sm:col-span-2' : ''}>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Target Garment Category:
                    </label>
                    <select
                      value={priceSetCategory}
                      onChange={(e) => setPriceSetCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                    >
                      <option value="ALL">All Garment Items in Selected Scope</option>
                      {priceSetAvailableGarments.map((garm) => (
                        <option key={garm} value={garm}>
                          {garm}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Price Set Strategy */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider block">
                  2. Choose Price Set Rule
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceSetStrategy('PERCENTAGE')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                      priceSetStrategy === 'PERCENTAGE'
                        ? 'bg-[#030A91] text-white border-[#030A91] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Percent className="w-4 h-4 mx-auto mb-1" />
                    <span>Percentage (+/- %)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriceSetStrategy('FIXED_AMOUNT')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                      priceSetStrategy === 'FIXED_AMOUNT'
                        ? 'bg-[#030A91] text-white border-[#030A91] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 mx-auto mb-1" />
                    <span>Fixed Step (+/- KES)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriceSetStrategy('SET_BASE')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition-all ${
                      priceSetStrategy === 'SET_BASE'
                        ? 'bg-[#030A91] text-white border-[#030A91] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 mx-auto mb-1" />
                    <span>Uniform Base (KES)</span>
                  </button>
                </div>

                {/* Strategy specific parameters */}
                {priceSetStrategy === 'PERCENTAGE' && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Percentage Price Change:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={priceSetPercentage}
                        onChange={(e) => setPriceSetPercentage(Number(e.target.value))}
                        className="w-28 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono"
                      />
                      <span className="font-bold text-slate-600">%</span>
                      <div className="flex space-x-1 pl-2">
                        {[-10, -5, 5, 10, 15].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setPriceSetPercentage(pct)}
                            className="px-2 py-1 bg-slate-100 hover:bg-[#030A91] hover:text-white rounded-lg text-[10px] font-bold transition-colors"
                          >
                            {pct > 0 ? `+${pct}%` : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Positive values mark up prices (e.g. +10%); negative values apply discounts.
                    </p>
                  </div>
                )}

                {priceSetStrategy === 'FIXED_AMOUNT' && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Fixed Amount to Add or Deduct (KES):
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={priceSetFixedAmount}
                        onChange={(e) => setPriceSetFixedAmount(Number(e.target.value))}
                        className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono"
                      />
                      <span className="font-bold text-slate-600">KES</span>
                    </div>
                  </div>
                )}

                {priceSetStrategy === 'SET_BASE' && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Set Target Price Across All Sizes (KES):
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={priceSetTargetPrice}
                        onChange={(e) => setPriceSetTargetPrice(Number(e.target.value))}
                        className="w-36 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono"
                      />
                      <span className="font-bold text-slate-600">KES</span>
                    </div>
                  </div>
                )}

                {/* Rounding option */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">
                    Round Resulting Prices To:
                  </span>
                  <select
                    value={priceSetRoundTo}
                    onChange={(e) => setPriceSetRoundTo(Number(e.target.value))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value={1}>Exact (No Rounding)</option>
                    <option value={10}>Nearest KES 10</option>
                    <option value={50}>Nearest KES 50</option>
                    <option value={100}>Nearest KES 100</option>
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPriceSetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApplyingPriceSet}
                  className="flex-1 py-2.5 rounded-xl bg-[#030A91] text-white text-xs font-bold hover:bg-blue-900 shadow-sm disabled:opacity-50"
                >
                  {isApplyingPriceSet ? 'Applying Price Set...' : 'Apply Price Set to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Dedicated Single Product Price Set Modal */}
      <ProductPriceSetModal
        product={priceSetSelectedProduct}
        isOpen={isSinglePriceSetModalOpen}
        onClose={() => {
          setIsSinglePriceSetModalOpen(false);
          setPriceSetSelectedProduct(null);
        }}
        onSaved={(updated) => {
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }}
      />
    </div>
  );
};
