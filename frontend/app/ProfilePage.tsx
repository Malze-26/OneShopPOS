import { Link } from 'react-router';
import { User, Mail, Phone, MapPin, Calendar, Edit } from 'lucide-react';

export function ProfilePage() {
  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      {/* Profile Header Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec] mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-[#155dfc] rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">CS</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#101828] mb-1">Chamara Silva</h1>
              <p className="text-sm text-[#4a5565]">Store Manager</p>
              <span className="inline-block mt-2 px-2 py-1 bg-[#ecfdf3] text-[#12b76a] text-xs font-medium rounded-full">
                Active
              </span>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#155dfc] text-[#155dfc] hover:bg-[#eff4ff] rounded-lg text-sm font-medium transition-colors">
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828] mb-4">Personal Information</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#4a5565] mt-0.5" />
              <div>
                <p className="text-xs text-[#4a5565] mb-1">Email Address</p>
                <p className="text-sm font-medium text-[#101828]">chamara.silva@oneshop.lk</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#4a5565] mt-0.5" />
              <div>
                <p className="text-xs text-[#4a5565] mb-1">Phone Number</p>
                <p className="text-sm font-medium text-[#101828]">+94 77 123 4567</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#4a5565] mt-0.5" />
              <div>
                <p className="text-xs text-[#4a5565] mb-1">Location</p>
                <p className="text-sm font-medium text-[#101828]">Colombo, Sri Lanka</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#4a5565] mt-0.5" />
              <div>
                <p className="text-xs text-[#4a5565] mb-1">Joined Date</p>
                <p className="text-sm font-medium text-[#101828]">January 15, 2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
          <h2 className="text-base font-semibold text-[#101828] mb-4">Account Settings</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#4a5565] mb-1">User Role</p>
              <p className="text-sm font-medium text-[#101828]">Store Manager</p>
            </div>

            <div>
              <p className="text-xs text-[#4a5565] mb-1">Store ID</p>
              <p className="text-sm font-medium text-[#101828]">STORE-2025-001</p>
            </div>

            <div>
              <p className="text-xs text-[#4a5565] mb-1">Last Login</p>
              <p className="text-sm font-medium text-[#101828]">February 20, 2026 at 9:30 AM</p>
            </div>

            <div className="pt-4 border-t border-[#e4e7ec]">
              <button className="text-sm text-[#155dfc] hover:underline font-medium">
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-[#e4e7ec]">
        <h2 className="text-base font-semibold text-[#101828] mb-4">Activity Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#f9fafb] rounded-lg">
            <p className="text-xs text-[#4a5565] mb-1">Products Added</p>
            <p className="text-2xl font-bold text-[#101828]">48</p>
          </div>
          <div className="p-4 bg-[#f9fafb] rounded-lg">
            <p className="text-xs text-[#4a5565] mb-1">Stock Adjustments</p>
            <p className="text-2xl font-bold text-[#101828]">124</p>
          </div>
          <div className="p-4 bg-[#f9fafb] rounded-lg">
            <p className="text-xs text-[#4a5565] mb-1">Actions This Month</p>
            <p className="text-2xl font-bold text-[#101828]">267</p>
          </div>
        </div>
      </div>
    </div>
  );
}
