import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '../types';
import {
  X,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { api } from '../api';
import { useNotification } from '../context/NotificationContext';

interface ProductPriceSetModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedProduct: Product) => void;
}

export const ProductPriceSetModal: React.FC<ProductPriceSetModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { notify } = useNotification();
  if (!isOpen || !product) return null;

  const [activeTab, setActiveTab] = useState<'matrix' | 'uniform' | 'formula' | 'tiered'>('matrix');
  const [variants, setVariants] = useState<ProductVariant[]>(() =>
    JSON.parse(JSON.stringify(product.variants || []))
  );

  // Quick settings states
  const [flatPrice, setFlatPrice] = useState<number>(() => {
    return product.variants?.[0]?.sellingPrice || 1000;
  });
  const [formulaType, setFormulaType] = useState<'PERCENTAGE' | 'FIXED_STEP'>('PERCENTAGE');
  const [formulaPercentage, setFormulaPercentage] = useState<number>(10);
  const [formulaStep, setFormulaStep] = useState<number>(100);
  const [roundToNearest, setRoundToNearest] = useState<number>(10);

  // Tiered pricing states
  const [tier1Price, setTier1Price] = useState<number>(1000);
  const [tier2Price, setTier2Price] = useState<number>(1200);
  const [tier3Price, setTier3Price] = useState<number>(1400);

  const [isSaving, setIsSaving] = useState(false);

  // Reset variants if product changes
  useEffect(() => {
    if (product) {
      setVariants(JSON.parse(JSON.stringify(product.variants || [])));
      const base = product.variants?.[0]?.sellingPrice || 1000;
      setFlatPrice(base);
      setTier1Price(base);
      setTier2Price(Math.round(base * 1.15 / 10) * 10);
      setTier3Price(Math.round(base * 1.3 / 10) * 10);
    }
  }, [product]);

  const handlePriceChange = (variantId: string, field: 'sellingPrice' | 'costPrice', val: number) => {
    const num = Math.max(0, val);
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [field]: num } : v))
    );
  };

  // Apply Uniform Flat Price
  const handleApplyFlatPrice = () => {
    if (flatPrice <= 0) {
      notify({ type: 'WARNING', title: 'Invalid Price', message: 'Please enter a positive selling price' });
      return;
    }
    setVariants((prev) =>
      prev.map((v) => ({ ...v, sellingPrice: flatPrice }))
    );
    notify({
      type: 'SUCCESS',
      title: 'Flat Price Applied',
      message: `Set all ${variants.length} sizes to KES ${flatPrice.toLocaleString()}`,
    });
    setActiveTab('matrix');
  };

  // Apply Formula (Markup % or Fixed Step)
  const handleApplyFormula = () => {
    setVariants((prev) =>
      prev.map((v) => {
        let newPrice = v.sellingPrice;
        if (formulaType === 'PERCENTAGE') {
          const factor = 1 + formulaPercentage / 100;
          newPrice = Math.round(v.sellingPrice * factor);
        } else {
          newPrice = Math.max(0, v.sellingPrice + formulaStep);
        }

        if (roundToNearest > 0) {
          newPrice = Math.round(newPrice / roundToNearest) * roundToNearest;
        }

        return { ...v, sellingPrice: newPrice };
      })
    );

    notify({
      type: 'SUCCESS',
      title: 'Formula Applied',
      message:
        formulaType === 'PERCENTAGE'
          ? `Adjusted prices by ${formulaPercentage > 0 ? '+' : ''}${formulaPercentage}%`
          : `Adjusted prices by ${formulaStep > 0 ? '+' : ''}KES ${formulaStep}`,
    });
    setActiveTab('matrix');
  };

  // Apply Tiered Pricing
  const handleApplyTiered = () => {
    const total = variants.length;
    if (total === 0) return;

    // Split variants into 3 tiers based on sorted sequence
    const third = Math.ceil(total / 3);
    setVariants((prev) =>
      prev.map((v, idx) => {
        let p = tier1Price;
        if (idx >= third * 2) {
          p = tier3Price;
        } else if (idx >= third) {
          p = tier2Price;
        }
        return { ...v, sellingPrice: p };
      })
    );

    notify({
      type: 'SUCCESS',
      title: 'Tiered Pricing Set',
      message: `Small sizes: KES ${tier1Price}, Medium: KES ${tier2Price}, Large: KES ${tier3Price}`,
    });
    setActiveTab('matrix');
  };

  // Reset to original
  const handleResetToOriginal = () => {
    if (product) {
      setVariants(JSON.parse(JSON.stringify(product.variants || [])));
      notify({ type: 'INFO', title: 'Reset', message: 'Reverted to current catalog prices' });
    }
  };

  // Save changes
  const handleSavePrices = async () => {
    setIsSaving(true);
    try {
      const res = await api.setProductPrices(product.id, { variants });
      notify({
        type: 'SUCCESS',
        title: 'Price Set Saved',
        message: `Successfully updated prices for ${res.variantsUpdated} size variants of ${product.name}.`,
      });
      onSaved(res.product || { ...product, variants });
      onClose();
    } catch (err: any) {
      notify({ type: 'ERROR', title: 'Save Failed', message: err.message || 'Could not save prices' });
    } finally {
      setIsSaving(false);
    }
  };

  const avgSelling =
    variants.length > 0
      ? Math.round(variants.reduce((acc, v) => acc + v.sellingPrice, 0) / variants.length)
      : 0;
  const avgCost =
    variants.length > 0
      ? Math.round(variants.reduce((acc, v) => acc + v.costPrice, 0) / variants.length)
      : 0;
  const avgMargin =
    avgSelling > 0 ? Math.round(((avgSelling - avgCost) / avgSelling) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#02066F] to-[#030A91] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FACB00] text-[#030A91] flex items-center justify-center font-black shadow-md shrink-0">
              <SlidersHorizontal className="w-5 h-5 text-[#030A91]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm sm:text-base tracking-tight text-white leading-tight">
                  Uniform Price Set Manager
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FACB00] text-[#030A91]">
                  {product.school}
                </span>
              </div>
              <p className="text-xs text-blue-200 truncate max-w-sm mt-0.5">
                {product.name} • {variants.length} active sizes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Avg. Cost Price
              </span>
              <span className="font-mono font-bold text-slate-700">
                KES {avgCost.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200"></div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Avg. Retail Price
              </span>
              <span className="font-mono font-black text-[#030A91]">
                KES {avgSelling.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200"></div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Avg. Profit Margin
              </span>
              <span
                className={`font-mono font-black px-1.5 py-0.5 rounded text-[11px] ${
                  avgMargin >= 30
                    ? 'bg-emerald-100 text-emerald-800'
                    : avgMargin > 15
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {avgMargin}%
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetToOriginal}
            className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Prices</span>
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-white flex space-x-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'border-[#030A91] text-[#030A91]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Size-by-Size Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('uniform')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'uniform'
                ? 'border-[#030A91] text-[#030A91]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Uniform Price (All Sizes)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tiered')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'tiered'
                ? 'border-[#030A91] text-[#030A91]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Size-Tiered Pricing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('formula')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'formula'
                ? 'border-[#030A91] text-[#030A91]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Markup / Formula (+%)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: Size-by-Size Price Matrix */}
          {activeTab === 'matrix' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 uppercase tracking-wider pb-1">
                <span>Size Specification</span>
                <span className="text-right">Cost (KES) &amp; Retail Selling (KES)</span>
              </div>

              <div className="space-y-2">
                {variants.map((v, idx) => {
                  const margin =
                    v.sellingPrice > 0
                      ? Math.round(((v.sellingPrice - v.costPrice) / v.sellingPrice) * 100)
                      : 0;

                  return (
                    <div
                      key={v.id || idx}
                      className="bg-slate-50 hover:bg-blue-50/50 p-3 rounded-2xl border border-slate-200 transition-colors flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-16 px-2.5 py-1.5 rounded-xl bg-[#030A91] text-[#FACB00] font-mono font-black text-center text-xs shadow-xs">
                          Size {v.size}
                        </span>
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 block">
                            {v.sku}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              margin >= 30
                                ? 'text-emerald-600'
                                : margin > 15
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            Margin: {margin}%
                          </span>
                        </div>
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
                              handlePriceChange(v.id, 'costPrice', Number(e.target.value))
                            }
                            className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-700 uppercase block">
                            Selling Price:
                          </label>
                          <input
                            type="number"
                            value={v.sellingPrice}
                            onChange={(e) =>
                              handlePriceChange(v.id, 'sellingPrice', Number(e.target.value))
                            }
                            className="w-28 px-2.5 py-1.5 bg-white border-2 border-[#030A91] text-[#030A91] font-mono text-xs font-black rounded-xl focus:ring-2 focus:ring-[#030A91]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Uniform Flat Price */}
          {activeTab === 'uniform' && (
            <div className="space-y-4 max-w-lg mx-auto py-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#030A91] flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-slate-900">
                  Set One Standard Price Across All Sizes
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Ideal for uniform items sold at standard flat rates regardless of child or adult size.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Standard Selling Price (KES):
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={flatPrice}
                    onChange={(e) => setFlatPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border-2 border-[#030A91] text-[#030A91] rounded-xl text-base font-black font-mono"
                  />
                  <span className="font-extrabold text-slate-600 text-sm">KES</span>
                </div>

                {/* Quick Presets */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Quick Preset Amounts:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[650, 850, 1000, 1200, 1350, 1500, 1800, 2200].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFlatPrice(preset)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                          flatPrice === preset
                            ? 'bg-[#030A91] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        KES {preset.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyFlatPrice}
                  className="w-full py-2.5 mt-2 rounded-xl bg-[#030A91] text-white font-black text-xs hover:bg-blue-900 shadow-md transition-all"
                >
                  Apply KES {flatPrice.toLocaleString()} to All {variants.length} Sizes
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Size-Tiered Pricing */}
          {activeTab === 'tiered' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2">
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-slate-900">
                  Size-Tiered Pricing Setup
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Configure graduated pricing based on garment sizes (e.g. Juniors vs Seniors, or S-M vs L-XXL).
                </p>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-800 text-xs block">
                      Tier 1: Small Sizes (Early Grades / S)
                    </span>
                    <span className="text-[10px] text-slate-400">First third of size spectrum</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={tier1Price}
                      onChange={(e) => setTier1Price(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs"
                    />
                    <span className="text-slate-500 font-bold">KES</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <div>
                    <span className="font-black text-slate-800 text-xs block">
                      Tier 2: Medium Sizes (Mid Grades / M-L)
                    </span>
                    <span className="text-[10px] text-slate-400">Middle size spectrum</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={tier2Price}
                      onChange={(e) => setTier2Price(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs"
                    />
                    <span className="text-slate-500 font-bold">KES</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <div>
                    <span className="font-black text-slate-800 text-xs block">
                      Tier 3: Large Sizes (Seniors / XL-3XL)
                    </span>
                    <span className="text-[10px] text-slate-400">Largest size spectrum</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={tier3Price}
                      onChange={(e) => setTier3Price(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs"
                    />
                    <span className="text-slate-500 font-bold">KES</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyTiered}
                  className="w-full py-2.5 mt-2 rounded-xl bg-[#030A91] text-white font-black text-xs hover:bg-blue-900 shadow-md transition-all"
                >
                  Apply Graduated Tiers to Sizes
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Formula / Markup */}
          {activeTab === 'formula' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-slate-900">
                  Formula-Based Price Adjustment
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust current selling prices by a uniform markup percentage or fixed amount.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormulaType('PERCENTAGE')}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                      formulaType === 'PERCENTAGE'
                        ? 'bg-[#030A91] text-white border-[#030A91]'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Percentage (+/- %)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormulaType('FIXED_STEP')}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all ${
                      formulaType === 'FIXED_STEP'
                        ? 'bg-[#030A91] text-white border-[#030A91]'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Fixed Step (+/- KES)
                  </button>
                </div>

                {formulaType === 'PERCENTAGE' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Percentage Markup:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={formulaPercentage}
                        onChange={(e) => setFormulaPercentage(Number(e.target.value))}
                        className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs"
                      />
                      <span className="font-bold text-slate-600">%</span>
                      <div className="flex space-x-1 pl-2">
                        {[5, 10, 15, 20].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormulaPercentage(p)}
                            className="px-2 py-1 rounded bg-white hover:bg-slate-200 border border-slate-200 text-[10px] font-bold"
                          >
                            +{p}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Amount to Add or Deduct (KES):
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={formulaStep}
                        onChange={(e) => setFormulaStep(Number(e.target.value))}
                        className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs"
                      />
                      <span className="font-bold text-slate-600">KES</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600">
                    Round Resulting Prices:
                  </span>
                  <select
                    value={roundToNearest}
                    onChange={(e) => setRoundToNearest(Number(e.target.value))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value={1}>Exact (No Rounding)</option>
                    <option value={10}>Nearest KES 10</option>
                    <option value={50}>Nearest KES 50</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleApplyFormula}
                  className="w-full py-2.5 mt-2 rounded-xl bg-[#030A91] text-white font-black text-xs hover:bg-blue-900 shadow-md transition-all"
                >
                  Apply Formula to All Sizes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Audit log recorded upon saving</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePrices}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#030A91] text-white text-xs font-black hover:bg-blue-900 shadow-md transition-all disabled:opacity-50 flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#FACB00]" />
              <span>{isSaving ? 'Saving Prices...' : 'Save Product Price Set'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
