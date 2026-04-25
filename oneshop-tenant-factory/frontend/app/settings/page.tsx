'use client';

import { useState, useEffect, FormEvent } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { authAPI } from '../../utils/api';
import { User, Lock, CheckCircle, XCircle } from 'lucide-react';

interface UserData { name: string; email: string; role?: string }

export default function SettingsPage() {
  const [userData, setUserData] = useState<UserData>({ name: '', email: '' });
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (stored) {
      const parsed: UserData = JSON.parse(stored);
      setUserData(parsed);
      setProfileName(parsed.name || '');
      setProfileEmail(parsed.email || '');
    }
  }, []);

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      const data = await authAPI.updateProfile(profileName, profileEmail);
      if (data.success) {
        const updated = { ...userData, name: profileName, email: profileEmail };
        setUserData(updated);
        const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(updated));
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
      } else { setProfileMsg({ type: 'error', text: data.message || 'Failed to update profile.' }); }
    } catch { setProfileMsg({ type: 'error', text: 'Network error. Please try again.' }); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
    if (newPassword.length < 8) { setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return; }
    setPasswordLoading(true);
    try {
      const data = await authAPI.changePassword(currentPassword, newPassword);
      if (data.success) { setPasswordMsg({ type: 'success', text: 'Password changed successfully.' }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
      else { setPasswordMsg({ type: 'error', text: data.message || 'Failed to change password.' }); }
    } catch { setPasswordMsg({ type: 'error', text: 'Network error. Please try again.' }); }
    finally { setPasswordLoading(false); }
  };

  const MsgBox = ({ msg }: { msg: { type: 'success' | 'error'; text: string } }) => (
    <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {msg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
      {msg.text}
    </div>
  );

  return (
    <MainLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account profile and security.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ede9fe' }}>
              <User className="w-5 h-5" style={{ color: '#151194' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Profile Information</h2>
              <p className="text-sm text-gray-500">Update your name and email address.</p>
            </div>
          </div>
          {profileMsg && <MsgBox msg={profileMsg} />}
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 outline-none text-sm" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 outline-none text-sm" placeholder="you@example.com" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={profileLoading} className="px-5 py-2 text-white text-sm font-medium rounded-lg transition disabled:opacity-60" style={{ backgroundColor: '#151194' }}>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => { setProfileName(userData.name); setProfileEmail(userData.email); setProfileMsg(null); }} className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-500">Use a strong password of at least 8 characters.</p>
            </div>
          </div>
          {passwordMsg && <MsgBox msg={passwordMsg} />}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 outline-none text-sm" placeholder="Enter current password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 outline-none text-sm" placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 outline-none text-sm" placeholder="Re-enter new password" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={passwordLoading} className="px-5 py-2 text-white text-sm font-medium rounded-lg transition disabled:opacity-60" style={{ backgroundColor: '#151194' }}>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
