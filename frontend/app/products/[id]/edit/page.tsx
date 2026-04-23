'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Upload, X, Sparkles } from 'lucide-react';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';

interface Category {
  _id: string;
  name: string;
}

interface ImagePreview {
  file: File;
  previewUrl: string;
}

const SERVER_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

export default function EditProductPage() {
  const { currency } = useStore();
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    sellingPrice: '',
    costPrice: '',
    initialStock: '',
    lowStockThreshold: '',
    category: '',
    isWeightBased: false,
    unit: 'item' as 'kg' | 'item',
  });
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<ImagePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = params.id as string;
    Promise.all([api.get(`/products/${id}`), api.get('/categories')])
      .then(([productRes, catRes]) => {
        const p = productRes.data.data;
        setFormData({
          name: p.name,
          sku: p.sku,
          description: p.description || '',
          sellingPrice: String(p.sellingPrice),
          costPrice: String(p.costPrice),
          initialStock: String(p.stock),
          lowStockThreshold: String(p.lowStockThreshold),
          category: p.category,
          isWeightBased: p.isWeightBased ?? false,
          unit: p.unit ?? 'item',
        });
        setExistingImages(p.images ?? []);
        setCategories(catRes.data.data);
      })
      .catch(() => setError('Failed to load product'))
      .finally(() => setFetchLoading(false));
  }, [params.id]);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => newImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
  }, [newImages]);

  const totalImages = existingImages.length + newImages.length;

  const addFiles = (files: FileList | File[]) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const valid = Array.from(files).filter((f) => allowed.includes(f.type));
    if (valid.length === 0) return;
    const previews: ImagePreview[] = valid.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewImages((prev) => [...prev, ...previews].slice(0, Math.max(0, 10 - existingImages.length)));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = async (imagePath: string) => {
    const filename = imagePath.split('/').pop()!;
    try {
      const res = await api.delete(`/products/${params.id}/images/${filename}`);
      setExistingImages(res.data.data.images ?? []);
    } catch {
      setError('Failed to delete image');
    }
  };

  const generateSKU = () => {
    const randomSKU = `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setFormData({ ...formData, sku: randomSKU });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put(`/products/${params.id}`, {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        sellingPrice: Number(formData.sellingPrice),
        costPrice: Number(formData.costPrice),
        stock: Number(formData.initialStock),
        lowStockThreshold: Number(formData.lowStockThreshold),
        category: formData.category,
        isWeightBased: formData.isWeightBased,
        unit: formData.unit,
      });

      if (newImages.length > 0) {
        const formPayload = new FormData();
        newImages.forEach((img) => formPayload.append('images', img.file));
        await api.post(`/products/${params.id}/images`, formPayload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      router.push(`/products/${params.id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-sm text-[#4a5565]">Loading product...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#101828] mb-1">Edit Product</h1>
        <p className="text-sm text-[#4a5565]">Update the details for this product</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fef3f2] border border-[#f04438]/20 rounded-lg text-sm text-[#f04438]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#101828] mb-2">Product Name</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-[#101828] mb-2">SKU (Stock Keeping Unit)</label>
                  <div className="flex gap-2">
                    <input
                      id="sku"
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="SKU-XXXXX"
                      className="flex-1 px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateSKU}
                      className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg text-sm font-medium transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[#101828] mb-2">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description"
                    rows={4}
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">Pricing</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sellingPrice" className="block text-sm font-medium text-[#101828] mb-2">Selling Price ({currency})</label>
                  <input
                    id="sellingPrice"
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="costPrice" className="block text-sm font-medium text-[#101828] mb-2">Cost Price ({currency})</label>
                  <input
                    id="costPrice"
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">Inventory</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="initialStock" className="block text-sm font-medium text-[#101828] mb-2">Current Stock Quantity</label>
                  <input
                    id="initialStock"
                    type="number"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-[#101828] mb-2">Low Stock Threshold</label>
                  <input
                    id="lowStockThreshold"
                    type="number"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] placeholder-[#4a5565] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Product Images */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">
                Product Images
                <span className="text-xs font-normal text-[#4a5565] ml-2">({totalImages}/10)</span>
              </h2>

              {/* Drop zone */}
              {totalImages < 10 && (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                        : 'border-[#e4e7ec] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/30'
                    }`}
                  >
                    <Upload className="w-7 h-7 text-[#4a5565] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[#101828] mb-1">Drag & drop images here</p>
                    <p className="text-xs text-[#4a5565] mb-3">or click to browse</p>
                    <span className="px-4 py-1.5 border border-[#e4e7ec] text-[#4a5565] hover:bg-[#f9fafb] rounded-lg text-sm transition-colors">
                      Choose Files
                    </span>
                    <p className="text-xs text-[#4a5565] mt-2">JPEG, PNG, WebP, GIF · max 5 MB each</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </>
              )}

              {/* Existing images from server */}
              {existingImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-[#4a5565] mb-2">Saved images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingImages.map((src) => (
                      <div key={src} className="relative aspect-square rounded-lg overflow-hidden border border-[#e4e7ec] group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${SERVER_URL}${src}`} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(src)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New (pending upload) images */}
              {newImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-[#4a5565] mb-2">New images (will upload on save)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {newImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--color-primary)]/40 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeNewImage(idx); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-4">Category</h2>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-[#101828] mb-2">Select Category</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  required
                >
                  <option value="">Choose a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selling Type */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
              <h2 className="text-base font-semibold text-[#101828] mb-1">Selling Type</h2>
              <p className="text-xs text-[#4a5565] mb-4">Weight-based products let cashiers enter exact quantity (e.g. 0.5 kg of rice)</p>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setFormData(f => ({ ...f, isWeightBased: !f.isWeightBased, unit: !f.isWeightBased ? 'kg' : 'item' }))}
                  className={`w-11 h-6 rounded-full transition-colors ${formData.isWeightBased ? 'bg-[var(--color-primary)]' : 'bg-[#d0d5dd]'} relative`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.isWeightBased ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-[#101828]">Sold by weight (kg)</span>
              </label>
              {formData.isWeightBased && (
                <p className="mt-3 text-xs text-[var(--color-primary)] bg-[var(--color-primary-light)] rounded-lg px-3 py-2">
                  Price will be per kg. Cashier enters exact weight at checkout.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="mt-6 flex items-center justify-end gap-3 bg-white rounded-xl p-4 shadow-sm border border-[#e4e7ec]">
          <Link
            href={`/products/${params.id}`}
            className="px-6 py-2 text-[#4a5565] hover:text-[#101828] hover:bg-[#f9fafb] rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[var(--color-primary)] hover:bg-[#0d4dd9] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
