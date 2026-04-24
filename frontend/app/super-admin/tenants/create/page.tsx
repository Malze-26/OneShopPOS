'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Building2, Mail, Palette } from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout';
import { tenantAPI } from '../../../../utils/api';

interface FormData {
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  email: string;
  logo: File | null;
  primaryColor: string;
  activeStatus: boolean;
  subscriptionTier: string;
}

export default function CreateTenantPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    businessAddress: '',
    phoneNumber: '',
    email: '',
    logo: null,
    primaryColor: '#3B82F6',
    activeStatus: true,
    subscriptionTier: 'free',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [themePreview, setThemePreview] = useState<'primary' | 'badge'>('primary');
  const [loading, setLoading] = useState(false);

  const quickColors = [
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#06B6D4',
    '#EF4444',
    '#84CC16',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setFormData({ ...formData, logo: file });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tenantData = {
        businessName: formData.businessName,
        businessAddress: formData.businessAddress,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        logo: logoPreview,
        primaryColor: formData.primaryColor,
        subscription: {
          plan: formData.subscriptionTier,
          status: formData.activeStatus ? 'active' : 'inactive',
        },
        status: formData.activeStatus ? 'active' : 'inactive',
      };

      const data = await tenantAPI.create(tenantData);

      if (data.success) {
        alert('Tenant created successfully!');
        router.push('/super-admin/tenants');
      } else {
        alert(data.message || 'Failed to create tenant');
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      alert('Error creating tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Tenants</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Tenant</h1>
          <p className="text-gray-600">Set Up A New Business Tenant for the system</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Business Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
            </div>

            <div className="space-y-4">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Enter business name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Business Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  placeholder="Enter complete business address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+1-XXX-XXX-XXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="business@example.com"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
            </div>

            <div className="space-y-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Logo
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                  {logoPreview ? (
                    <div className="space-y-4">
                      <img src={logoPreview} alt="Logo preview" className="max-h-32 mx-auto" />
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition cursor-pointer">
                        <Upload className="w-4 h-4" />
                        Change Logo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG or SVG (MAX. 800x400px, 2MB)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Theme Colors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme Colors
                </label>
                <div className="mb-4">
                  <label className="block text-xs text-gray-600 mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleChange}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Quick Colors */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-600 mb-2">Quick Presets</label>
                  <div className="flex gap-2">
                    {quickColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, primaryColor: color })}
                        className="w-10 h-10 rounded-lg border-2 transition hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: formData.primaryColor === color ? '#000' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Theme Preview */}
                <div className="mt-4">
                  <label className="block text-xs text-gray-600 mb-2">Theme Preview</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setThemePreview('primary')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        themePreview === 'primary'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Primary Button
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePreview('badge')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        themePreview === 'badge'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Active Badge
                    </button>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    {themePreview === 'primary' ? (
                      <button
                        type="button"
                        className="px-6 py-3 text-white rounded-lg font-medium"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        Sample Primary Button
                      </button>
                    ) : (
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: formData.primaryColor + '20',
                          color: formData.primaryColor,
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: formData.primaryColor }}
                        />
                        Active Status Badge
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            </div>

            <div className="space-y-4">
              {/* Active Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Active Status</p>
                  <p className="text-sm text-gray-600">Enable user access for tenants</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="activeStatus"
                    checked={formData.activeStatus}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Subscription Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Tier
                </label>
                <select
                  name="subscriptionTier"
                  value={formData.subscriptionTier}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="free">Free Plan</option>
                  <option value="basic">Basic Plan</option>
                  <option value="premium">Premium Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-white rounded-lg font-medium transition disabled:opacity-50"
              style={{ backgroundColor: '#151194' }}
            >
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
