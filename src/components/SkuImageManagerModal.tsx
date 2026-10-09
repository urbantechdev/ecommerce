import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Trash2,
  Eye,
  RefreshCw,
  FolderUp,
  Tag,
  Store,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Check,
  Copy,
  Download,
  HelpCircle,
  Camera,
  Shirt,
  Scissors
} from 'lucide-react';
import { Product, ProductVariant, SkuImageCategory } from '../types';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext';

interface SkuImageManagerModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  initialSku?: string;
}

export interface SkuItem {
  productId: string;
  productName: string;
  school: string;
  category: string;
  sector?: string;
  garmentType?: string;
  variantId: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  sellingPrice: number;
  imageUrl?: string;
  imageCategory?: string;
}

interface BulkFileItem {
  id: string;
  file: File;
  previewUrl: string;
  filename: string;
  matchedSku: string | null;
  matchedSkuItem: SkuItem | null;
  imageCategory: SkuImageCategory;
  status: 'PENDING' | 'MATCHED' | 'MANUAL' | 'UPLOADED' | 'FAILED';
}

export const SKU_IMAGE_CATEGORIES: Array<{
  id: SkuImageCategory;
  label: string;
  description: string;
  badgeClass: string;
}> = [
  {
    id: 'FRONT',
    label: 'Front View (Catalog)',
    description: 'Main product photo displayed on POS & receipts',
    badgeClass: 'bg-blue-100 text-[#030A91] border-blue-200',
  },
  {
    id: 'BACK',
    label: 'Back / Profile View',
    description: 'Rear perspective showing cuts, pleats, vents, or zippers',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  },
  {
    id: 'FABRIC',
    label: 'Fabric & Weave Swatch',
    description: 'Close-up texture of fabric weave, pattern, or color swatch',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  {
    id: 'BADGE',
    label: 'Badge & School Crest',
    description: 'Embroidered school crest, logo, monogram, or patch',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  {
    id: 'SIZE_CHART',
    label: 'Size & Fit Chart',
    description: 'Measurement guidelines, sizing dimensions, and specs',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
  },
  {
    id: 'PACKAGING',
    label: 'Tag & Packaging Label',
    description: 'Barcode tag, care label, washing instructions, or box pack',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  {
    id: 'OTHER',
    label: 'Other / Accessory Photo',
    description: 'Miscellaneous styling or accessory details',
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-200',
  },
];

export const SkuImageManagerModal: React.FC<SkuImageManagerModalProps> = ({
  products,
  isOpen,
  onClose,
  onRefresh,
  initialSku,
}) => {
  const { notify } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const categoryFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'catalog' | 'bulk' | 'category' | 'url'>('catalog');
  const [searchQuery, setSearchQuery] = useState(initialSku || '');
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedImageCategoryFilter, setSelectedImageCategoryFilter] = useState<string>('ALL');
  const [imageFilter, setImageFilter] = useState<'ALL' | 'WITH_IMAGE' | 'NO_IMAGE'>('ALL');

  // Single SKU upload state
  const [activeUploadSku, setActiveUploadSku] = useState<SkuItem | null>(null);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<SkuImageCategory>('FRONT');
  const [isUploading, setIsUploading] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string; category?: string } | null>(null);

  // Bulk Upload states
  const [bulkFiles, setBulkFiles] = useState<BulkFileItem[]>([]);
  const [bulkDefaultCategory, setBulkDefaultCategory] = useState<SkuImageCategory>('FRONT');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Category Batch Upload state
  const [batchSchool, setBatchSchool] = useState<string>('ALL');
  const [batchCategory, setBatchCategory] = useState<string>('ALL');
  const [batchImageCategory, setBatchImageCategory] = useState<SkuImageCategory>('FRONT');
  const [batchImageUrl, setBatchImageUrl] = useState<string>('');
  const [isBatchApplying, setIsBatchApplying] = useState(false);

  // Direct URL assignment state
  const [directSku, setDirectSku] = useState(initialSku || '');
  const [directUrl, setDirectUrl] = useState('');
  const [directCategory, setDirectCategory] = useState<SkuImageCategory>('FRONT');

  // Naming helper drawer
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Flatten all SKUs across all products
  const allSkus: SkuItem[] = useMemo(() => {
    const list: SkuItem[] = [];
    products.forEach((p) => {
      p.variants.forEach((v) => {
        list.push({
          productId: p.id,
          productName: p.name,
          school: p.school,
          category: p.category,
          sector: p.sector,
          garmentType: p.garmentType,
          variantId: v.id,
          sku: v.sku,
          barcode: v.barcode,
          size: v.size,
          color: v.color,
          sellingPrice: v.sellingPrice,
          imageUrl: v.imageUrl || p.imageUrl || undefined,
          imageCategory: v.imageCategory || p.imageCategory || 'FRONT',
        });
      });
    });
    return list;
  }, [products]);

  // Unique lists for filters
  const schools = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.school) set.add(p.school);
    });
    return Array.from(set).sort();
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered SKUs
  const filteredSkus = useMemo(() => {
    return allSkus.filter((item) => {
      if (selectedSchool !== 'ALL' && item.school !== selectedSchool) return false;
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (selectedImageCategoryFilter !== 'ALL' && item.imageCategory !== selectedImageCategoryFilter) return false;
      if (imageFilter === 'WITH_IMAGE' && !item.imageUrl) return false;
      if (imageFilter === 'NO_IMAGE' && item.imageUrl) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchName = item.productName.toLowerCase().includes(q);
        const matchSchool = item.school.toLowerCase().includes(q);
        const matchSize = item.size.toLowerCase().includes(q);
        const matchBarcode = item.barcode.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchSchool && !matchSize && !matchBarcode) return false;
      }
      return true;
    });
  }, [allSkus, selectedSchool, selectedCategory, selectedImageCategoryFilter, imageFilter, searchQuery]);

  // Image Statistics
  const stats = useMemo(() => {
    const total = allSkus.length;
    const withImage = allSkus.filter((s) => s.imageUrl).length;
    const withoutImage = total - withImage;
    const percentage = total > 0 ? Math.round((withImage / total) * 100) : 0;
    return { total, withImage, withoutImage, percentage };
  }, [allSkus]);

  // Category batch candidates preview
  const categoryBatchCandidates = useMemo(() => {
    return allSkus.filter((item) => {
      if (batchSchool !== 'ALL' && item.school !== batchSchool) return false;
      if (batchCategory !== 'ALL' && item.category !== batchCategory) return false;
      return true;
    });
  }, [allSkus, batchSchool, batchCategory]);

  if (!isOpen) return null;

  // Single File Selected for a specific SKU
  const handleSingleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadSku) return;

    if (file.size > 8 * 1024 * 1024) {
      notify({
        type: 'ERROR',
        title: 'File Too Large',
        message: 'Please choose an image file under 8MB',
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        await api.updateSkuImage({
          sku: activeUploadSku.sku,
          variantId: activeUploadSku.variantId,
          imageUrl: dataUrl,
          imageCategory: selectedUploadCategory,
        });

        notify({
          type: 'SUCCESS',
          title: 'SKU Image File Uploaded',
          message: `Saved ${selectedUploadCategory} image for SKU ${activeUploadSku.sku}`,
        });

        await onRefresh();
        setActiveUploadSku(null);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Upload Failed',
        message: err.message || 'Could not save SKU image',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Update Image Category directly from card
  const handleUpdateImageCategory = async (sku: SkuItem, newCat: SkuImageCategory) => {
    if (!sku.imageUrl) return;
    try {
      await api.updateSkuImage({
        sku: sku.sku,
        variantId: sku.variantId,
        imageUrl: sku.imageUrl,
        imageCategory: newCat,
      });
      notify({
        type: 'SUCCESS',
        title: 'Category Updated',
        message: `Updated image category to ${newCat} for SKU ${sku.sku}`,
      });
      await onRefresh();
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Update Failed',
        message: err.message || 'Could not update image category',
      });
    }
  };

  // Remove Image from SKU
  const handleRemoveImage = async (sku: SkuItem) => {
    if (!confirm(`Remove image from SKU ${sku.sku}?`)) return;
    try {
      await api.updateSkuImage({
        sku: sku.sku,
        variantId: sku.variantId,
        imageUrl: '',
      });
      notify({
        type: 'INFO',
        title: 'Image Removed',
        message: `Removed image from SKU ${sku.sku}`,
      });
      await onRefresh();
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Update Failed',
        message: err.message || 'Could not remove image',
      });
    }
  };

  // Bulk File Selection with Auto-Matching
  const handleBulkFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: BulkFileItem[] = files.map((file) => {
      const filename = file.name;
      const cleanName = filename.replace(/\.[^/.]+$/, '').trim().toLowerCase();

      // Find matching SKU
      const matched = allSkus.find((s) => {
        const skuClean = s.sku.toLowerCase().trim();
        return skuClean === cleanName || cleanName.includes(skuClean) || skuClean.includes(cleanName);
      });

      // Detect if filename mentions category like "fabric", "badge", "back"
      let detectedCat: SkuImageCategory = bulkDefaultCategory;
      if (cleanName.includes('badge') || cleanName.includes('crest') || cleanName.includes('logo')) {
        detectedCat = 'BADGE';
      } else if (cleanName.includes('fabric') || cleanName.includes('weave') || cleanName.includes('swatch')) {
        detectedCat = 'FABRIC';
      } else if (cleanName.includes('back') || cleanName.includes('rear')) {
        detectedCat = 'BACK';
      } else if (cleanName.includes('size') || cleanName.includes('chart')) {
        detectedCat = 'SIZE_CHART';
      }

      return {
        id: `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        filename,
        matchedSku: matched ? matched.sku : null,
        matchedSkuItem: matched || null,
        imageCategory: detectedCat,
        status: matched ? 'MATCHED' : 'PENDING',
      };
    });

    setBulkFiles((prev) => [...prev, ...newItems]);
    if (bulkInputRef.current) bulkInputRef.current.value = '';
  };

  // Process and Upload All Matched Bulk Images
  const handleApplyBulkUpload = async () => {
    const validItems = bulkFiles.filter((b) => b.matchedSku);
    if (validItems.length === 0) {
      notify({
        type: 'WARNING',
        title: 'No Matched SKUs',
        message: 'Please match image files to SKUs before applying',
      });
      return;
    }

    setIsBulkProcessing(true);
    try {
      const payload: Array<{ sku: string; imageUrl: string; filename: string; imageCategory?: string }> = [];

      for (const item of validItems) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(item.file);
        });

        payload.push({
          sku: item.matchedSku!,
          imageUrl: dataUrl,
          filename: item.filename,
          imageCategory: item.imageCategory,
        });
      }

      const res = await api.bulkUpdateSkuImages(payload, bulkDefaultCategory);

      notify({
        type: 'SUCCESS',
        title: 'Bulk SKU Images Saved',
        message: `Successfully updated ${res.matchedCount} uniform SKU image files!`,
      });

      await onRefresh();
      setBulkFiles([]);
      setActiveTab('catalog');
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Bulk Upload Error',
        message: err.message || 'Failed to batch process SKU images',
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Handle Category Batch File Selection
  const handleCategoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setBatchImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (categoryFileInputRef.current) categoryFileInputRef.current.value = '';
  };

  // Apply Category Batch Image
  const handleApplyCategoryBatch = async () => {
    if (!batchImageUrl) {
      notify({
        type: 'WARNING',
        title: 'No Image Selected',
        message: 'Please choose an image file to apply across the category',
      });
      return;
    }

    if (categoryBatchCandidates.length === 0) {
      notify({
        type: 'WARNING',
        title: 'No Matching SKUs',
        message: 'No SKUs match the selected School and Category filters',
      });
      return;
    }

    if (!confirm(`Apply this image to all ${categoryBatchCandidates.length} SKUs in this category?`)) {
      return;
    }

    setIsBatchApplying(true);
    try {
      const res = await api.applyCategorySkuImages({
        school: batchSchool !== 'ALL' ? batchSchool : undefined,
        category: batchCategory !== 'ALL' ? batchCategory : undefined,
        imageUrl: batchImageUrl,
        imageCategory: batchImageCategory,
      });

      notify({
        type: 'SUCCESS',
        title: 'Category Image Applied',
        message: `Assigned image to ${res.count} SKUs across this category!`,
      });

      await onRefresh();
      setBatchImageUrl('');
      setActiveTab('catalog');
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Category Batch Error',
        message: err.message || 'Failed to assign category image',
      });
    } finally {
      setIsBatchApplying(false);
    }
  };

  // Direct URL submit
  const handleDirectUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directSku || !directUrl) return;

    try {
      await api.updateSkuImage({
        sku: directSku,
        imageUrl: directUrl.trim(),
        imageCategory: directCategory,
      });
      notify({
        type: 'SUCCESS',
        title: 'Image URL Linked',
        message: `Linked photo to SKU ${directSku}`,
      });
      await onRefresh();
      setDirectUrl('');
      setDirectSku('');
      setActiveTab('catalog');
    } catch (err: any) {
      notify({
        type: 'ERROR',
        title: 'Failed to Link Image',
        message: err.message || 'Could not link image to SKU',
      });
    }
  };

  // Copy SKU list as naming template
  const handleCopySkuNames = () => {
    const list = allSkus.map((s) => `${s.sku}.jpg (${s.productName} - Size ${s.size})`).join('\n');
    navigator.clipboard.writeText(list);
    notify({
      type: 'SUCCESS',
      title: 'Copied SKU List',
      message: 'Copied all active uniform SKUs to clipboard for image naming.',
    });
  };

  // Download CSV of SKU naming checklist
  const handleDownloadChecklist = () => {
    const headers = 'SKU,Garment_Name,School,Category,Size,Recommended_Filename,Current_Image_Status\n';
    const rows = allSkus
      .map(
        (s) =>
          `"${s.sku}","${s.productName}","${s.school}","${s.category}","${s.size}","${s.sku}.jpg","${
            s.imageUrl ? 'HAS_IMAGE' : 'MISSING'
          }"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Naisiae_Uniform_SKU_Image_Checklist_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full h-[92vh] max-h-[880px] flex flex-col overflow-hidden border border-slate-200">
        {/* ==================================================== */}
        {/* MODAL HEADER                                         */}
        {/* ==================================================== */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#02066F] via-[#030A91] to-[#0412B3] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-[#FACB00] flex items-center justify-center font-bold shadow-inner">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  SKU Image Files & Category Uploader
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FACB00] text-[#030A91]">
                  Media Studio
                </span>
              </div>
              <p className="text-xs text-blue-200 font-medium">
                Easily organize uniform photos by category, batch auto-match by SKU filename, or apply across schools
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-bold transition-colors flex items-center space-x-1"
              title="Image naming helper guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#FACB00]" />
              <span className="hidden sm:inline">Naming Guide</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* NAMING GUIDE / CHEAT SHEET DRAWER (COLLAPSIBLE)     */}
        {/* ==================================================== */}
        {isGuideOpen && (
          <div className="bg-blue-50/90 border-b border-blue-200 p-4 text-xs text-slate-800 shrink-0 animate-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h4 className="font-black text-[#030A91] flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>How to Easily Upload Images in Bulk</span>
                </h4>
                <p className="text-slate-600">
                  1. Have your photography team name files after the uniform SKU, e.g.{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono font-bold text-[#030A91]">
                    NAI-BLZ-32.jpg
                  </code>{' '}
                  or{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono font-bold text-[#030A91]">
                    LEN-SHIRT-M_front.png
                  </code>
                  .
                  <br />
                  2. Open the <strong>Bulk Auto-Match</strong> tab and drop all files at once. The system will automatically link them!
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleCopySkuNames}
                  className="px-3 py-1.5 bg-white border border-blue-300 text-[#030A91] rounded-xl font-bold shadow-2xs hover:bg-blue-50 flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SKU List</span>
                </button>
                <button
                  onClick={handleDownloadChecklist}
                  className="px-3 py-1.5 bg-[#030A91] text-white rounded-xl font-bold shadow-2xs hover:bg-blue-900 flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5 text-[#FACB00]" />
                  <span>Download CSV Checklist</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STATS & TAB SWITCHER BAR                             */}
        {/* ==================================================== */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Quick Metrics */}
          <div className="flex items-center space-x-2.5 text-xs overflow-x-auto">
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-semibold">Total SKUs:</span>
              <strong className="text-slate-800 font-mono">{stats.total}</strong>
            </div>

            <div className="flex items-center space-x-1.5 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80 text-emerald-800 shadow-2xs shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold">With Image:</span>
              <strong className="font-mono">{stats.withImage}</strong>
              <span className="text-[10px] font-bold bg-emerald-200/70 px-1 py-0.2 rounded">
                {stats.percentage}%
              </span>
            </div>

            <div className="flex items-center space-x-1.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80 text-amber-800 shadow-2xs shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold">Missing:</span>
              <strong className="font-mono">{stats.withoutImage}</strong>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SKU Gallery ({filteredSkus.length})
            </button>

            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                activeTab === 'bulk'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Bulk Auto-Match ({bulkFiles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('category')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                activeTab === 'category'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Category Batch</span>
            </button>

            <button
              onClick={() => setActiveTab('url')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 whitespace-nowrap ${
                activeTab === 'url'
                  ? 'bg-white text-[#030A91] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Web Link</span>
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* MAIN BODY AREA                                       */}
        {/* ==================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0 bg-slate-100/50">
          {/* TAB 1: SKU PHOTO GALLERY */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              {/* Category Filter Pills & Search */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  {/* Search Bar */}
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search SKU (e.g. NAI-BLZ-32), garment name, or school..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91] transition-all"
                    />
                  </div>

                  {/* School Filter Dropdown */}
                  <div className="w-full sm:w-auto">
                    <select
                      value={selectedSchool}
                      onChange={(e) => setSelectedSchool(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                    >
                      <option value="ALL">All Schools ({schools.length})</option>
                      {schools.map((sch) => (
                        <option key={sch} value={sch}>
                          {sch}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Image Filter Pill */}
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs shrink-0 self-stretch sm:self-auto justify-center">
                    <button
                      onClick={() => setImageFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        imageFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setImageFilter('NO_IMAGE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        imageFilter === 'NO_IMAGE' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Needs Image
                    </button>
                    <button
                      onClick={() => setImageFilter('WITH_IMAGE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        imageFilter === 'WITH_IMAGE' ? 'bg-emerald-100 text-emerald-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Has Image
                    </button>
                  </div>
                </div>

                {/* Categories & Image Categories Scrollable Pills */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  {/* Garment Category Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pr-1">
                      Garment Type:
                    </span>
                    <button
                      onClick={() => setSelectedCategory('ALL')}
                      className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                        selectedCategory === 'ALL'
                          ? 'bg-[#030A91] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Garments
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                          selectedCategory === cat
                            ? 'bg-[#030A91] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Image Category Filter Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pr-1">
                      Photo Type:
                    </span>
                    <button
                      onClick={() => setSelectedImageCategoryFilter('ALL')}
                      className={`px-2.5 py-0.5 rounded-lg font-bold whitespace-nowrap text-[11px] transition-all ${
                        selectedImageCategoryFilter === 'ALL'
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Photo Types
                    </button>
                    {SKU_IMAGE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedImageCategoryFilter(cat.id)}
                        className={`px-2.5 py-0.5 rounded-lg font-bold whitespace-nowrap text-[11px] transition-all ${
                          selectedImageCategoryFilter === cat.id
                            ? 'bg-blue-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SKU Grid */}
              {filteredSkus.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-600">No matching uniform SKUs found</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing your category or search filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {filteredSkus.map((sku) => {
                    const hasImg = !!sku.imageUrl;
                    const catObj = SKU_IMAGE_CATEGORIES.find((c) => c.id === sku.imageCategory) || SKU_IMAGE_CATEGORIES[0];

                    return (
                      <div
                        key={sku.variantId}
                        className={`bg-white rounded-2xl border-2 transition-all p-3 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                          hasImg ? 'border-slate-200 hover:border-blue-400' : 'border-amber-200/80 hover:border-amber-400 bg-amber-50/20'
                        }`}
                      >
                        <div>
                          {/* Image Thumbnail Box */}
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5 border border-slate-200 group">
                            {hasImg ? (
                              <>
                                <img
                                  src={sku.imageUrl}
                                  alt={sku.sku}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://placehold.co/400x400/f1f5f9/64748b?text=Uniform+Image';
                                  }}
                                />
                                {/* Overlay preview actions */}
                                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() =>
                                      setPreviewModalImage({
                                        url: sku.imageUrl!,
                                        title: `${sku.productName} (${sku.sku})`,
                                        category: catObj.label,
                                      })
                                    }
                                    className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white shadow-sm"
                                    title="View full size"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveUploadSku(sku);
                                      fileInputRef.current?.click();
                                    }}
                                    className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                    title="Replace photo"
                                  >
                                    <Upload className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveImage(sku)}
                                    className="p-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 shadow-sm"
                                    title="Remove image"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div
                                onClick={() => {
                                  setActiveUploadSku(sku);
                                  fileInputRef.current?.click();
                                }}
                                className="w-full h-full flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-amber-100/50 transition-colors"
                              >
                                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-1">
                                  <Upload className="w-4 h-4" />
                                </div>
                                <span className="text-[11px] font-bold text-amber-800">
                                  + Upload SKU Photo
                                </span>
                                <span className="text-[9px] text-slate-400 mt-0.5">
                                  PNG, JPG, WebP
                                </span>
                              </div>
                            )}

                            {/* SKU badge on top left */}
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono font-bold text-white shadow-xs truncate max-w-[85%]">
                              {sku.sku}
                            </span>

                            {/* Image Category Badge on bottom right */}
                            {hasImg && (
                              <span
                                className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-xs ${catObj.badgeClass}`}
                              >
                                {catObj.label.split(' ')[0]}
                              </span>
                            )}
                          </div>

                          {/* Garment Details */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                              {sku.school}
                            </span>
                            <h4 className="text-xs font-black text-slate-900 line-clamp-1 leading-snug">
                              {sku.productName}
                            </h4>

                            <div className="flex items-center space-x-1.5 pt-0.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                Size {sku.size}
                              </span>
                              {sku.color && sku.color !== 'Standard' && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-50 text-[#030A91]">
                                  {sku.color}
                                </span>
                              )}
                              <span className="text-[10px] font-black text-slate-800 ml-auto font-mono">
                                KES {sku.sellingPrice.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Action footer with Category Selector */}
                        <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                          {hasImg ? (
                            <div className="flex items-center justify-between gap-1 text-[10px]">
                              <span className="text-slate-400 font-bold shrink-0">Photo Tag:</span>
                              <select
                                value={sku.imageCategory || 'FRONT'}
                                onChange={(e) => handleUpdateImageCategory(sku, e.target.value as SkuImageCategory)}
                                className="bg-slate-50 border border-slate-200 rounded-md py-0.5 px-1 font-semibold text-slate-700 text-[10px] focus:outline-none"
                              >
                                {SKU_IMAGE_CATEGORIES.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                Missing Photo
                              </span>
                              <button
                                onClick={() => {
                                  setActiveUploadSku(sku);
                                  fileInputRef.current?.click();
                                }}
                                className="font-bold text-[#030A91] hover:underline flex items-center space-x-1"
                              >
                                <Upload className="w-3 h-3" />
                                <span>Upload</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BULK MULTI-FILE UPLOAD & AUTO-MATCHER */}
          {activeTab === 'bulk' && (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Batch Category Preset Selector */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Default Photo Category for this Batch:
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    All uploaded files will be tagged with this image category (can be customized per file)
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={bulkDefaultCategory}
                    onChange={(e) => setBulkDefaultCategory(e.target.value as SkuImageCategory)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {SKU_IMAGE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dropzone Banner */}
              <div
                onClick={() => bulkInputRef.current?.click()}
                className="bg-white rounded-3xl border-2 border-dashed border-[#030A91]/40 hover:border-[#030A91] p-8 text-center cursor-pointer transition-all hover:bg-blue-50/30 group shadow-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#030A91] mx-auto flex items-center justify-center font-bold mb-3 shadow-inner group-hover:scale-110 transition-transform">
                  <FolderUp className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Drop Uniform Image Files in Bulk (Auto-Matches to SKU)
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Name your image files with the SKU (e.g. <strong>NAI-BLZ-32.jpg</strong> or <strong>STR-SW-BLU-S.png</strong>).
                  The system will automatically recognize the SKU and connect the image!
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-[#030A91] text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-900 transition-colors inline-flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-[#FACB00]" />
                  <span>Choose Image Files from Computer / Phone</span>
                </button>
              </div>

              {/* Uploaded File Matching Queue */}
              {bulkFiles.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-sm text-slate-900">
                        Image Staging Queue ({bulkFiles.length} files)
                      </span>
                      <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                        {bulkFiles.filter((b) => b.matchedSku).length} Matched
                      </span>
                      {bulkFiles.some((b) => !b.matchedSku) && (
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                          {bulkFiles.filter((b) => !b.matchedSku).length} Unmatched
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setBulkFiles([])}
                        className="text-xs text-slate-500 hover:text-rose-600 font-semibold px-2 py-1 rounded"
                      >
                        Clear All
                      </button>
                      <button
                        disabled={isBulkProcessing || bulkFiles.filter((b) => b.matchedSku).length === 0}
                        onClick={handleApplyBulkUpload}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center space-x-1.5 disabled:opacity-50 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {isBulkProcessing
                            ? 'Processing & Saving...'
                            : `Apply ${bulkFiles.filter((b) => b.matchedSku).length} Matched Images`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* List of files with match dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {bulkFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-center space-x-3 transition-colors ${
                          item.matchedSku
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-amber-50/40 border-amber-200'
                        }`}
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.filename}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate" title={item.filename}>
                            {item.filename}
                          </p>

                          {/* SKU Matcher Select */}
                          <div className="mt-1 space-y-1">
                            <select
                              value={item.matchedSku || ''}
                              onChange={(e) => {
                                const newSku = e.target.value;
                                const matchedItem = allSkus.find((s) => s.sku === newSku) || null;
                                setBulkFiles((prev) =>
                                  prev.map((b, i) =>
                                    i === idx
                                      ? {
                                          ...b,
                                          matchedSku: newSku || null,
                                          matchedSkuItem: matchedItem,
                                          status: newSku ? 'MANUAL' : 'PENDING',
                                        }
                                      : b
                                  )
                                );
                              }}
                              className={`w-full text-[11px] font-mono py-1 px-2 rounded-lg border focus:outline-none ${
                                item.matchedSku
                                  ? 'bg-white border-emerald-300 text-emerald-900 font-bold'
                                  : 'bg-white border-amber-300 text-amber-900'
                              }`}
                            >
                              <option value="">-- Match to SKU --</option>
                              {allSkus.map((s) => (
                                <option key={s.variantId} value={s.sku}>
                                  {s.sku} ({s.productName.slice(0, 18)} - Sz {s.size})
                                </option>
                              ))}
                            </select>

                            <select
                              value={item.imageCategory}
                              onChange={(e) => {
                                const cat = e.target.value as SkuImageCategory;
                                setBulkFiles((prev) =>
                                  prev.map((b, i) => (i === idx ? { ...b, imageCategory: cat } : b))
                                );
                              }}
                              className="w-full text-[10px] py-0.5 px-2 rounded-lg border bg-white text-slate-700"
                            >
                              {SKU_IMAGE_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setBulkFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATEGORY & SCHOOL BATCH UPLOADER */}
          {activeTab === 'category' && (
            <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#030A91] mx-auto flex items-center justify-center font-bold mb-2">
                  <Tag className="w-6 h-6 text-[#030A91]" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Assign Image Across an Entire Uniform Category or School
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Save time by uploading 1 photo that automatically applies to all sizes/SKUs of a garment or school
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Target School:
                    </label>
                    <select
                      value={batchSchool}
                      onChange={(e) => setBatchSchool(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="ALL">All Schools</option>
                      {schools.map((sch) => (
                        <option key={sch} value={sch}>
                          {sch}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Garment Category:
                    </label>
                    <select
                      value={batchCategory}
                      onChange={(e) => setBatchCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="ALL">All Garment Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Image File Category Tag:
                  </label>
                  <select
                    value={batchImageCategory}
                    onChange={(e) => setBatchImageCategory(e.target.value as SkuImageCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {SKU_IMAGE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} — {c.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File picker for Category Batch */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Choose Image File:
                  </label>
                  <div
                    onClick={() => categoryFileInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-slate-300 hover:border-[#030A91] rounded-2xl bg-slate-50 text-center cursor-pointer transition-all"
                  >
                    {batchImageUrl ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={batchImageUrl}
                          alt="Batch Preview"
                          className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-2xs mb-2"
                        />
                        <span className="text-xs font-bold text-[#030A91]">
                          Click to Change Image
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="font-bold text-slate-700">Select Image File to Apply</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Matching Count */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900">Matching SKUs that will be updated:</span>
                  <span className="font-mono font-black text-[#030A91] bg-white px-2 py-0.5 rounded border border-blue-200">
                    {categoryBatchCandidates.length} SKUs
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isBatchApplying || !batchImageUrl || categoryBatchCandidates.length === 0}
                  onClick={handleApplyCategoryBatch}
                  className="w-full py-2.5 bg-[#030A91] text-white rounded-xl font-bold hover:bg-blue-900 transition-colors shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#FACB00]" />
                  <span>
                    {isBatchApplying
                      ? 'Applying to All SKUs...'
                      : `Apply Image to All ${categoryBatchCandidates.length} SKUs`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DIRECT IMAGE URL LINKING */}
          {activeTab === 'url' && (
            <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto flex items-center justify-center font-bold mb-2">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Link Web Image URL to Uniform SKU
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste a direct online image URL from Google Drive, Cloudinary, or web catalog
                </p>
              </div>

              <form onSubmit={handleDirectUrlSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Select Target Uniform SKU:
                  </label>
                  <select
                    value={directSku}
                    onChange={(e) => setDirectSku(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                    required
                  >
                    <option value="">-- Choose uniform variant SKU --</option>
                    {allSkus.map((s) => (
                      <option key={s.variantId} value={s.sku}>
                        {s.sku} — {s.productName} ({s.school}) Size {s.size}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Photo Category:
                  </label>
                  <select
                    value={directCategory}
                    onChange={(e) => setDirectCategory(e.target.value as SkuImageCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {SKU_IMAGE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Direct Image URL:
                  </label>
                  <input
                    type="url"
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                    placeholder="https://example.com/photos/uniform-blazer.jpg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#030A91]"
                    required
                  />
                </div>

                {directUrl && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1.5">
                      Preview
                    </p>
                    <img
                      src={directUrl}
                      alt="Preview"
                      className="w-24 h-24 object-cover mx-auto rounded-xl border border-slate-200 shadow-2xs"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://placehold.co/200x200/fee2e2/991b1b?text=Invalid+Image+URL';
                      }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#030A91] text-white rounded-xl font-bold hover:bg-blue-900 transition-colors shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4 text-[#FACB00]" />
                  <span>Assign Image URL to SKU</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* HIDDEN FILE INPUTS FOR BROWSER PICKERS               */}
        {/* ==================================================== */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleSingleFileSelect}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={bulkInputRef}
          onChange={handleBulkFilesSelect}
          accept="image/*"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={categoryFileInputRef}
          onChange={handleCategoryFileSelect}
          accept="image/*"
          className="hidden"
        />

        {/* ==================================================== */}
        {/* FULL IMAGE LIGHTBOX PREVIEW MODAL                    */}
        {/* ==================================================== */}
        {previewModalImage && (
          <div
            onClick={() => setPreviewModalImage(null)}
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl border border-slate-200"
            >
              <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
                <div className="flex items-center space-x-2 truncate pr-2">
                  <span className="truncate">{previewModalImage.title}</span>
                  {previewModalImage.category && (
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-normal shrink-0">
                      {previewModalImage.category}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setPreviewModalImage(null)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 bg-slate-100 flex items-center justify-center max-h-[70vh] overflow-hidden">
                <img
                  src={previewModalImage.url}
                  alt={previewModalImage.title}
                  className="max-h-[65vh] w-auto object-contain rounded-lg shadow-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
