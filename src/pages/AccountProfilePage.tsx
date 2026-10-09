import React, { useState } from 'react';
import {
  User as UserIcon,
  MapPin,
  Shield,
  Plus,
  Trash2,
  Check,
  Save,
  Phone,
  Home,
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import type { ShippingAddress } from '../types/domain';

const INITIAL_ADDRESSES: (ShippingAddress & { id: string; isDefault: boolean })[] = [
  {
    id: 'addr-1',
    fullName: 'Sarah Customer',
    street: '742 Evergreen Terrace, Apt 4B',
    city: 'Springfield',
    state: 'OR',
    zipCode: '97477',
    country: 'United States',
    phone: '+1 (555) 019-2834',
    isDefault: true,
  },
  {
    id: 'addr-2',
    fullName: 'Sarah Customer (Work)',
    street: '120 Market Street, 14th Floor',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'United States',
    phone: '+1 (555) 882-9912',
    isDefault: false,
  },
];

export const AccountProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'security'>('profile');

  // Profile form state
  const [name, setName] = useState(user?.name || 'Sarah Customer');
  const [email, setEmail] = useState(user?.email || 'customer@demo.test');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Addresses state
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newZip, setNewZip] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      setUser({
        ...user,
        name,
        email,
      });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSetDefaultAddress = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      })),
    );
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet || !newCity || !newZip) return;

    const newAddr = {
      id: `addr-${Date.now()}`,
      fullName: name,
      street: newStreet,
      city: newCity,
      state: newState || 'CA',
      zipCode: newZip,
      country: 'United States',
      phone: newPhone || phone,
      isDefault: addresses.length === 0,
    };

    setAddresses([...addresses, newAddr]);
    setIsAddAddressOpen(false);
    setNewStreet('');
    setNewCity('');
    setNewZip('');
    setNewPhone('');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Account Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your personal profile, addresses, security credentials, and preferences.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-8 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            My Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'addresses'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Saved Addresses ({addresses.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'security'
                ? 'border-[#0071DC] text-[#0071DC]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="h-4 w-4" />
            Security & Login
          </button>
        </div>

        {/* TAB 1: Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xl shadow-slate-200/40">
            {savedSuccess && (
              <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                Profile changes saved successfully!
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center gap-5 pb-6 border-b border-slate-100">
                <div className="h-20 w-20 rounded-full bg-blue-100 text-[#0071DC] flex items-center justify-center font-black text-2xl border-2 border-blue-200">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {(user?.roles || ['customer']).map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600"
                      >
                        {role}
                      </span>
                    ))}
                    {user?.vendorStatus === 'approved' && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                        Verified Seller
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 focus:border-[#0071DC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 focus:border-[#0071DC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 focus:border-[#0071DC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071DC]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Account Status
                  </label>
                  <input
                    type="text"
                    value="Active & Verified"
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-2xl bg-[#0071DC] hover:bg-[#005bb5] text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Addresses */}
        {activeTab === 'addresses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Your Shipping Addresses</h3>
              <button
                type="button"
                onClick={() => setIsAddAddressOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-[#0071DC] text-white px-4 py-2 text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-[#005bb5] transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add New Address
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`rounded-3xl border p-6 transition-all ${
                    addr.isDefault
                      ? 'border-[#0071DC] bg-blue-50/30 shadow-md shadow-blue-500/10'
                      : 'border-slate-200/80 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Home className="h-4 w-4 text-slate-400" />
                      {addr.fullName}
                    </span>
                    {addr.isDefault ? (
                      <span className="rounded-full bg-[#0071DC] text-white px-2.5 py-0.5 text-[10px] font-bold">
                        Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-[11px] font-bold text-[#0071DC] hover:underline cursor-pointer"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {addr.street}<br />
                    {addr.city}, {addr.state} {addr.zipCode}<br />
                    {addr.country}
                  </p>

                  <p className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {addr.phone}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end gap-3 text-xs">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal for adding address */}
            {isAddAddressOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                  <h3 className="text-base font-bold text-slate-900 mb-4">Add Shipping Address</h3>
                  <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        value={newStreet}
                        onChange={(e) => setNewStreet(e.target.value)}
                        placeholder="123 Main Street, Apt 1"
                        className="w-full rounded-xl border border-slate-200 p-2.5"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">City</label>
                        <input
                          type="text"
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          placeholder="San Francisco"
                          className="w-full rounded-xl border border-slate-200 p-2.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">State</label>
                        <input
                          type="text"
                          value={newState}
                          onChange={(e) => setNewState(e.target.value)}
                          placeholder="CA"
                          className="w-full rounded-xl border border-slate-200 p-2.5"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Postal / ZIP Code</label>
                        <input
                          type="text"
                          value={newZip}
                          onChange={(e) => setNewZip(e.target.value)}
                          placeholder="94105"
                          className="w-full rounded-xl border border-slate-200 p-2.5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full rounded-xl border border-slate-200 p-2.5"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsAddAddressOpen(false)}
                        className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-[#0071DC] px-4 py-2 font-bold text-white shadow-md hover:bg-[#005bb5] cursor-pointer"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Security */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xl shadow-slate-200/40 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Password & Authentication</h3>
              <p className="text-xs text-slate-500">
                Update your account password or review active sign-in sessions.
              </p>
            </div>

            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => alert('Password updated successfully')}
                className="rounded-2xl bg-[#0071DC] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#005bb5] cursor-pointer"
              >
                Update Password
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Active Devices & Sessions
              </h4>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
                <div>
                  <div className="font-bold text-slate-900">Chrome on Windows (Current Session)</div>
                  <div className="text-slate-500">San Francisco, CA • IP: 192.168.1.1</div>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-700 font-bold px-2.5 py-0.5 text-[10px]">
                  Active Now
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
