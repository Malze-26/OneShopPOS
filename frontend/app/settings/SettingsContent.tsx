'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Store, Palette, KeyRound, Upload, Check, Eye, EyeOff, Loader2, User } from 'lucide-react';
import api from '@/app/lib/api';
import { useStore } from '@/app/contexts/StoreContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { avatarSrc } from '@/app/lib/avatarUtils';

const CURRENCIES = [
  { code: 'LKR', label: 'LKR — Sri Lankan Rupee', locale: 'en-LK' },
  { code: 'USD', label: 'USD — US Dollar',         locale: 'en-US' },
  { code: 'EUR', label: 'EUR — Euro',               locale: 'en-EU' },
  { code: 'GBP', label: 'GBP — British Pound',     locale: 'en-GB' },
  { code: 'INR', label: 'INR — Indian Rupee',       locale: 'en-IN' },
  { code: 'AUD', label: 'AUD — Australian Dollar', locale: 'en-AU' },
];

const COLOR_PRESETS = [
  { label: 'Blue',   value: '#155dfc' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Pink',   value: '#db2777' },
  { label: 'Red',    value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Green',  value: '#059669' },
  { label: 'Teal',   value: '#0891b2' },
  { label: 'Dark',   value: '#1e293b' },
];

type Tab = 'store' | 'appearance' | 'account';

export default function SettingsContent() {
  const store = useStore();
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const storeSynced    = useRef(false);

  const initialTab = (searchParams.get('tab') as Tab) ?? 'store';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Store Info
  const [storeName, setStoreName]     = useState(store.storeName);
  const [address, setAddress]         = useState(store.address);
  const [phone, setPhone]             = useState(store.phone);
  const [email, setEmail]             = useState(store.email);
  const [currency, setCurrency]       = useState(store.currency);

  const cleanColor = (c: string) => '#' + c.replace(/^#+/, '');

  // Appearance
  const [primaryColor, setPrimaryColor] = useState(cleanColor(store.primaryColor || '#155dfc'));
  const [logoPreview, setLogoPreview]   = useState<string>(store.logoUrl ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${store.logoUrl}` : '');
  const [logoFile, setLogoFile]         = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Profile
  const [profileName, setProfileName]   = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [profilePhone, setProfilePhone] = useState(user?.phone ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string>(avatarSrc(user?.avatar));

  // Sync all form fields once store context finishes loading from the API.
  // store.storeId is '' in the defaults and becomes non-empty after the first
  // successful GET /settings, making it a reliable "data loaded" signal.
  useEffect(() => {
    if (storeSynced.current || !store.storeId) return;
    storeSynced.current = true;

    setStoreName(store.storeName);
    setAddress(store.address ?? '');
    setPhone(store.phone ?? '');
    setEmail(store.email ?? '');
    setCurrency(store.currency);
    setPrimaryColor(cleanColor(store.primaryColor || '#155dfc'));

    if (store.logoUrl) {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace('/api', '');
      setLogoPreview(`${apiBase}${store.logoUrl}`);
    }
  }, [store.storeId]);

  // Sync profile fields once user loads from AuthContext
  useEffect(() => {
    if (!user) return;
    setProfileName(n => n || user.name);
    setProfileEmail(user.email);
    setProfilePhone(p => p || (user.phone ?? ''));
    if (user.avatar && !avatarPreview) {
      setAvatarPreview(avatarSrc(user.avatar));
    }
  }, [user]);
  const [avatarFile, setAvatarFile]       = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Account / Password
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [showPw, setShowPw]         = useState({ current: false, new: false, confirm: false });
  const [pwError, setPwError]       = useState('');

  const initials = (profileName || user?.name || 'U')
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const chosen = CURRENCIES.find(c => c.code === currency);
      await api.patch('/settings', {
        storeName,
        address,
        phone,
        email,
        currency,
        currencyLocale: chosen?.locale ?? 'en-LK',
      });
      store.refresh();
      showToast('Store info saved');
    } catch {
      showToast('Failed to save', false);
    } finally {
      setSaving(false);
    }
  };

  const handleAppearanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Upload logo first if a new file was selected
      if (logoFile) {
        setUploadingLogo(true);
        const form = new FormData();
        form.append('logo', logoFile);
        const uploadRes = await api.post('/settings/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        const serverLogoUrl = uploadRes.data?.data?.logoUrl as string | undefined;
        if (serverLogoUrl) {
          const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace('/api', '');
          setLogoPreview(`${apiBase}${serverLogoUrl}`);
        }
        setLogoFile(null);
        setUploadingLogo(false);
      }
      await api.patch('/settings', { primaryColor: cleanColor(primaryColor) });
      await store.refresh();
      showToast('Appearance saved');
    } catch {
      showToast('Failed to save', false);
      setUploadingLogo(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return; }
    if (newPw.length < 8)    { setPwError('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showToast('Password changed');
    } catch (err: any) {
      setPwError(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (avatarFile) {
        setUploadingAvatar(true);
        const form = new FormData();
        form.append('avatar', avatarFile);
        const { data } = await api.post('/auth/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setAvatarPreview(avatarSrc(data.avatar));
        setAvatarFile(null);
        setUploadingAvatar(false);
      }
      await api.patch('/auth/profile', { name: profileName, phone: profilePhone });
      await refreshUser();
      showToast('Profile saved');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save profile', false);
      setUploadingAvatar(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = useCallback((file: File) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = e => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleLogoFile = useCallback((file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'store',      label: 'Store Info',  icon: <Store className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance',  icon: <Palette className="w-4 h-4" /> },
    { id: 'account',    label: 'Account',     icon: <KeyRound className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? 'bg-[#059669]' : 'bg-[#dc2626]'}`}>
          {toast.ok && <Check className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">Settings</h1>
        <p className="text-sm text-[#4a5565] mt-1">Manage your store configuration and account</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f3f4f6] p-1 rounded-xl mb-6 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-[#101828] shadow-sm'
                : 'text-[#4a5565] hover:text-[#101828]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Store Info Tab ── */}
      {tab === 'store' && (
        <form onSubmit={handleStoreSubmit} className="bg-white rounded-2xl border border-[#e4e7ec] p-6 space-y-5">
          <h2 className="text-base font-semibold text-[#101828]">Store Information</h2>

          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1.5">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1.5">Currency</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#101828] mb-1.5">Address</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              rows={2}
              placeholder="123 Main Street, Colombo"
              className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1.5">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+94 77 123 4567"
                className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="store@example.com"
                className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: primaryColor }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* ── Appearance Tab ── */}
      {tab === 'appearance' && (
        <form onSubmit={handleAppearanceSubmit} className="bg-white rounded-2xl border border-[#e4e7ec] p-6 space-y-6">
          <h2 className="text-base font-semibold text-[#101828]">Appearance</h2>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-3">Store Logo</label>
            <div className="flex items-start gap-5">
              {/* Preview */}
              <div className="w-20 h-20 rounded-xl border-2 border-[#e4e7ec] flex items-center justify-center bg-[#f9fafb] overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                  : <Store className="w-8 h-8 text-[#d1d5db]" />
                }
              </div>
              {/* Drop zone */}
              <div
                className="flex-1 border-2 border-dashed border-[#e4e7ec] rounded-xl p-5 text-center cursor-pointer hover:border-[var(--color-primary)] hover:bg-[#f5f8ff] transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={onFileDrop}
              >
                <Upload className="w-5 h-5 text-[#9ca3af] mx-auto mb-2" />
                <p className="text-sm text-[#4a5565]">
                  <span className="font-semibold" style={{ color: primaryColor }}>Click to upload</span> or drag & drop
                </p>
                <p className="text-xs text-[#9ca3af] mt-1">PNG, JPG, WEBP · max 2MB</p>
                {logoFile && <p className="text-xs text-[#059669] mt-2 font-medium">✓ {logoFile.name}</p>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
              />
            </div>
          </div>

          {/* Color Theme */}
          <div>
            <label className="block text-sm font-medium text-[#101828] mb-3">Primary Color</label>
            <p className="text-xs text-[#4a5565] mb-3">This color is applied across the management dashboard, POS system, and website.</p>

            {/* Preset swatches */}
            <div className="flex flex-wrap gap-3 mb-4">
              {COLOR_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  title={p.label}
                  onClick={() => setPrimaryColor(p.value)}
                  className="w-9 h-9 rounded-full border-4 transition-all hover:scale-110"
                  style={{
                    background: p.value,
                    borderColor: primaryColor === p.value ? p.value : 'transparent',
                    outline: primaryColor === p.value ? `3px solid ${p.value}` : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>

            {/* Custom color picker */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[#e4e7ec] cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v.startsWith('#') ? v : '#' + v);
                }}
                className="w-28 px-3 py-2 border border-[#e4e7ec] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <span className="text-xs text-[#4a5565]">Custom hex</span>
            </div>

            {/* Live preview */}
            <div className="mt-4 p-4 rounded-xl border border-[#e4e7ec] bg-[#f9fafb]">
              <p className="text-xs font-semibold text-[#4a5565] uppercase tracking-wider mb-3">Preview</p>
              <div className="flex gap-2 flex-wrap">
                <button type="button" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: primaryColor }}>Primary Button</button>
                <button type="button" className="px-4 py-2 rounded-lg text-sm font-semibold border-2" style={{ color: primaryColor, borderColor: primaryColor }}>Outline Button</button>
                <span className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: `${primaryColor}18`, color: primaryColor }}>Badge</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: primaryColor }}
            >
              {saving || uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Appearance
            </button>
          </div>
        </form>
      )}

      {/* ── Account Tab ── */}
      {tab === 'account' && (
        <div className="space-y-6">
          {/* Profile Info */}
          <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl border border-[#e4e7ec] p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#101828]">Profile Information</h2>
              <p className="text-sm text-[#4a5565] mt-1">Update your name, email, phone, and profile picture.</p>
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-3">Profile Picture</label>
              <div className="flex items-center gap-5">
                {/* Avatar preview */}
                <div className="w-20 h-20 rounded-full border-2 border-[#e4e7ec] flex items-center justify-center bg-[#f9fafb] overflow-hidden flex-shrink-0">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    : <span className="text-xl font-bold" style={{ color: primaryColor }}>{initials}</span>
                  }
                </div>
                {/* Upload button */}
                <div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 border border-[#e4e7ec] rounded-lg text-sm font-medium text-[#101828] hover:bg-[#f9fafb] transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {avatarFile ? avatarFile.name : 'Upload Photo'}
                  </button>
                  <p className="text-xs text-[#9ca3af] mt-1.5">PNG, JPG, WEBP · max 2MB</p>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }}
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1.5">Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Email — read-only, set by Super Admin */}
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1.5">Email Address</label>
              <input
                type="email"
                value={profileEmail}
                readOnly
                className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm bg-[#f9fafb] text-[#4a5565] cursor-not-allowed"
              />
              <p className="text-xs text-[#9ca3af] mt-1">Email can only be changed by a Super Admin.</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-[#101828] mb-1.5">Phone Number</label>
              <input
                type="text"
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value)}
                placeholder="+94 77 123 4567"
                className="w-full px-4 py-2.5 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: primaryColor }}
              >
                {saving || uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                Save Profile
              </button>
            </div>
          </form>

          {/* Change Password */}
          <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl border border-[#e4e7ec] p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#101828]">Change Password</h2>
              <p className="text-sm text-[#4a5565] mt-1">Update your account password. You'll stay logged in.</p>
            </div>

            {[
              { label: 'Current Password', value: currentPw, onChange: setCurrentPw, key: 'current' as const },
              { label: 'New Password',     value: newPw,     onChange: setNewPw,     key: 'new' as const },
              { label: 'Confirm New Password', value: confirmPw, onChange: setConfirmPw, key: 'confirm' as const },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-[#101828] mb-1.5">{field.label}</label>
                <div className="relative">
                  <input
                    type={showPw[field.key] ? 'text' : 'password'}
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 pr-10 border border-[#e4e7ec] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => ({ ...p, [field.key]: !p[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#4a5565]"
                  >
                    {showPw[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            {pwError && (
              <div className="px-4 py-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg text-sm text-[#dc2626]">
                {pwError}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: primaryColor }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Change Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
