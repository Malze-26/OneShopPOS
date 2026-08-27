'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Upload, Building2, Mail, Phone, MapPin, Palette } from 'lucide-react';
import MainLayout from '../../../components/layout/MainLayout';
import { tenantAPI } from '../../../../utils/api';

interface FormData {
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  email: string;
  primaryColor: string;
  status: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionEndDate: string;
}

const quickColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#151194'];

export default function EditTenantPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    businessAddress: '',
    phoneNumber: '',
    email: '',
    primaryColor: '#3B82F6',
    status: 'active',
    subscriptionPlan: 'basic',
    subscriptionStatus: 'active',
    subscriptionEndDate: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const data = await tenantAPI.getOne(id);
        if (data.success) {
          const t = data.tenant;
          let formattedEndDate = '';
          if (t.subscription?.endDate) {
            const parsed = new Date(t.subscription.endDate);
            if (!isNaN(parsed.getTime())) {
              formattedEndDate = parsed.toISOString().split('T')[0];
            }
          }

          setFormData({
            businessName: t.businessName || '',
            businessAddress: t.businessAddress || '',
            phoneNumber: t.phoneNumber || '',
            email: t.email || '',
            primaryColor: t.primaryColor || '#3B82F6',
            status: t.status || 'active',
            subscriptionPlan: t.subscription?.plan || 'basic',
            subscriptionStatus: t.subscription?.status || 'active',
            subscriptionEndDate: formattedEndDate,
          });
          if (t.logo) setLogoPreview(t.logo);
        } else {
          setError(data.message || 'Tenant not found');
        }
      } catch {
        setError('Failed to connect to server');
      } finally {
        setFetching(false);
      }
    };
    if (id) fetchTenant();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = {
        businessName: formData.businessName,
        businessAddress: formData.businessAddress,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        primaryColor: formData.primaryColor,
        logo: logoPreview,
        status: formData.status,
        subscription: {
          plan: formData.subscriptionPlan,
          status: formData.subscriptionStatus,
          endDate: formData.subscriptionEndDate || undefined,
        },
      };
      const data = await tenantAPI.update(id, updateData);
      if (data.success) {
        router.push(`/tenants/${id}`);
      } else {
        alert(data.message || 'Failed to update tenant');
      }
    } catch {
      alert('Error updating tenant');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Loading tenant...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/tenants')}
              className="px-4 py-2 text-white rounded-lg"
              style={{ backgroundColor: '#151194' }}
            >
              Back to Tenants
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Edit Tenant</h1>
          <p className="text-gray-500">Update details for <span className="font-medium text-gray-700">{formData.businessName}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text" name="businessName" value={formData.businessName} onChange={handleChange} required
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text" name="businessAddress" value={formData.businessAddress} onChange={handleChange} required
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email" name="email" value={formData.email} onChange={handleChange} required
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status & Subscription */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Status & Subscription</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                <select
                  name="status" value={formData.status} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="trial">Trial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Plan</label>
                <select
                  name="subscriptionPlan" value={formData.subscriptionPlan} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Status</label>
                <select
                  name="subscriptionStatus" value={formData.subscriptionStatus} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription End Date</label>
                <input
                  type="date"
                  name="subscriptionEndDate"
                  value={formData.subscriptionEndDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                {logoPreview ? (
                  <div className="space-y-3">
                    <img src={logoPreview} alt="Logo preview" className="max-h-24 mx-auto rounded" />
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition text-sm">
                      <Upload className="w-4 h-4" />
                      Change Logo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload logo</p>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="color" name="primaryColor" value={formData.primaryColor} onChange={handleChange}
                  className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text" value={formData.primaryColor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono uppercase outline-none"
                />
              </div>

              <div className="flex gap-2 mb-4">
                {quickColors.map((color) => (
                  <button
                    key={color} type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, primaryColor: color }))}
                    className="w-9 h-9 rounded-lg border-2 transition hover:scale-110"
                    style={{ backgroundColor: color, borderColor: formData.primaryColor === color ? '#000' : 'transparent' }}
                  />
                ))}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <button
                  type="button" className="px-5 py-2 text-white rounded-lg text-sm font-medium"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  {formData.businessName || 'Sample Button'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pb-6">
            <button
              type="button" onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="px-8 py-3 text-white rounded-lg font-medium transition disabled:opacity-50"
              style={{ backgroundColor: '#151194' }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
