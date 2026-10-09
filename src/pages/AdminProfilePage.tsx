import React, { useState } from 'react';
import {
  User,
  Shield,
  Key,
  Smartphone,
  History,
  Check,
  CheckCircle2,
  Copy,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  Monitor,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

export const AdminProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'profile' | 'security' | 'permissions' | 'sessions' | 'audit'
  >('profile');

  // Form State
  const [firstName, setFirstName] = useState('Sarah');
  const [lastName, setLastName] = useState('Chen');
  const [workEmail, setWorkEmail] = useState('admin@demo.test');
  const [directPhone, setDirectPhone] = useState('+1 (555) 382-9012');
  const [jobTitle, setJobTitle] = useState('Head of Marketplace Operations & Platform Risk');
  const [department, setDepartment] = useState('Platform Engineering & Operations');
  const [timezone, setTimezone] = useState('UTC-05:00 (Eastern Time - US & Canada)');
  const [language, setLanguage] = useState('English (US)');
  const [bio, setBio] = useState(
    'Lead platform operator managing high-volume merchant disputes, KYC approvals, and financial settlement clearances for Vendora. Visible in internal audit logs, incident triage escalation channels, and platform governance reports.'
  );

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
  );

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('••••••••••••••••');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    disputeAlerts: true,
    kycWarnings: true,
    payoutSettlement: true,
    counterfeitFlags: true,
    systemAlerts: true,
  });

  // Dialog States
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const [activeSessions, setActiveSessions] = useState([
    {
      id: 'sess-1',
      device: 'Mac Studio',
      isCurrent: true,
      os: 'Chrome 129 • macOS Sequoia',
      location: 'San Francisco, US (198.51.100.24)',
      status: 'Active Now',
      icon: Monitor,
    },
    {
      id: 'sess-2',
      device: 'iPhone 16 Pro',
      isCurrent: false,
      os: 'Vendora Authenticator & Web',
      location: 'Cupertino, US (198.51.100.89)',
      status: '2 hours ago',
      icon: Smartphone,
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText('ADM-0048-COMP');
    setCopiedId(true);
    showToast('Administrator ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = () => {
    showToast('Profile and security changes saved successfully');
  };

  const handleDiscard = () => {
    setFirstName('Sarah');
    setLastName('Chen');
    setWorkEmail('admin@demo.test');
    setDirectPhone('+1 (555) 382-9012');
    setJobTitle('Head of Marketplace Operations & Platform Risk');
    setDepartment('Platform Engineering & Operations');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Unsaved changes discarded');
  };

  const handleRevokeOtherSessions = () => {
    setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
    setIsRevokeModalOpen(false);
    showToast('All other active sessions revoked successfully');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      showToast('Passwords must match and meet all security criteria');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    showToast('Password updated and cryptographic credentials re-issued');
  };

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" sidebar={<AdminNav />}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="mx-auto max-w-[1500px]">
        {/* =========================================================================
            Top Breadcrumb & Page Header (Catmin / Stitch Design)
            ========================================================================= */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>MARKETPLACE</span>
              <ChevronRight className="h-3 w-3" />
              <span>SETTINGS</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-700">ADMIN PROFILE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Admin Profile &amp; Account Settings
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Manage your administrator credentials, personal info, multi-factor authentication, security sessions, and notification preferences.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            Tab Navigation Bar
            ========================================================================= */}
        <div className="mb-8 flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'security'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Security &amp; Authentication</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'permissions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Role &amp; Permissions</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'sessions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Active Sessions &amp; Devices</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Audit Log &amp; History</span>
          </button>
        </div>

        {/* =========================================================================
            Main Grid: Left 2/3 Content + Right 1/3 Identity & Preferences Cards
            ========================================================================= */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* =======================================================================
              Left Column (Col Span 8)
              ======================================================================= */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1. Personal Information Section */}
            {(activeTab === 'profile' || activeTab === 'audit') && (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">Personal Information</h2>
                    <p className="text-xs text-slate-500">
                      Update your public administrator identity and direct communication channels.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-2xs">
                    SUPER ADMIN
                  </span>
                </div>

                {/* Avatar Row */}
                <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="relative h-18 w-18 shrink-0 rounded-full border-2 border-slate-200 bg-slate-100 p-0.5 shadow-xs">
                    <img
                      src={avatarUrl}
                      alt="Sarah Chen"
                      className="h-full w-full rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => showToast('Avatar updated')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Change Avatar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80');
                          showToast('Avatar reset to default');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Accepts JPG, PNG or WebP. Optimal size 1024x1024 px (Max 4MB).
                    </p>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Work Email</label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <Check className="h-3 w-3" />
                        <span>Verified</span>
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        value={workEmail}
                        onChange={(e) => setWorkEmail(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <Mail className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Direct Phone</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={directPhone}
                        onChange={(e) => setDirectPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      <Phone className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Job Title / Role</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                      <option>UTC-05:00 (Eastern Time - US &amp; Canada)</option>
                      <option>UTC-08:00 (Pacific Time - US &amp; Canada)</option>
                      <option>UTC+00:00 (Greenwich Mean Time - London)</option>
                      <option>UTC+01:00 (Central European Time)</option>
                      <option>UTC+05:00 (Pakistan Standard Time)</option>
                      <option>UTC+08:00 (Singapore / Hong Kong)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Language Preference</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                      <option>English (US)</option>
                      <option>English (UK)</option>
                      <option>Spanish (ES)</option>
                      <option>French (FR)</option>
                      <option>German (DE)</option>
                      <option>Japanese (JP)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-bold text-slate-700">Bio / Executive Staff Notes</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 leading-relaxed"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Visible in internal audit logs, incident triage escalation channels, and platform governance reports.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 2. Security & 2-Factor Authentication Section */}
            {(activeTab === 'security' || activeTab === 'profile' || activeTab === 'audit') && (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Security &amp; 2-Factor Authentication
                    </h2>
                    <p className="text-xs text-slate-500">
                      Manage strong cryptographic multi-factor protection and account passcodes.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Enforced Active</span>
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Card 1: Hardware Key */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          Hardware Key (YubiKey 5C) &amp; TOTP Authenticator
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Primary credential enforced by Platform Security Governance Policy.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsKeyModalOpen(true)}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Configure Keys
                    </button>
                  </div>

                  {/* Card 2: Recovery Codes */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                        <Key className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                          10 one-time recovery backup codes generated on Oct 12, 2025
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Store these codes offline in an encrypted vault. 8 of 10 remaining.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRecoveryModalOpen(true)}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      View Recovery Codes
                    </button>
                  </div>
                </div>

                {/* Sub-section: Update Password */}
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Update Password</h3>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-600">Current Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-600">New Password</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new strong password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-600">Confirm New Password</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    </div>

                    {/* Requirements pills */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        PASSWORD REQUIREMENTS
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          <Check className="h-2.5 w-2.5" />
                          <span>12+ characters</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          <Check className="h-2.5 w-2.5" />
                          <span>1+ special symbol</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          <Check className="h-2.5 w-2.5" />
                          <span>1+ numeric digit</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          <Check className="h-2.5 w-2.5" />
                          <span>Upper &amp; lower case</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5 text-slate-500" />
                        <span>Update Password</span>
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}

            {/* 3. Role Privileges & Admin Scope Section */}
            {(activeTab === 'permissions' || activeTab === 'profile' || activeTab === 'audit') && (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Role Privileges &amp; Admin Scope
                    </h2>
                    <p className="text-xs text-slate-500">
                      Delegated authorizations and compliance clearance envelopes across the marketplace cluster.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black tracking-wider text-white uppercase shadow-2xs">
                    FULL PLATFORM ACCESS
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ASSIGNED CLASSIFICATION
                  </span>
                  <p className="mt-0.5 text-sm sm:text-base font-black text-slate-900">
                    Super Administrator (Level 4 - Executive)
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    GOVERNING ENTITY: Platform Governance Board
                  </p>
                </div>

                <div className="mt-4">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ACTIVE SCOPE AUTHORIZATIONS
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { label: 'User Management', val: 'Full' },
                      { label: 'Vendor KYC', val: 'Override' },
                      { label: 'Financial Payouts', val: 'Approval' },
                      { label: 'Product Moderation', val: 'Chief' },
                      { label: 'Commission Logic', val: 'Write' },
                      { label: 'API Access', val: 'Root' },
                    ].map((auth, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 shadow-2xs text-[11px]"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-slate-700">{auth.label}:</span>
                        <span className="font-bold text-slate-900">{auth.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* 4. Audit Log Section (If Audit Tab Selected) */}
            {activeTab === 'audit' && (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                  Recent Administrator Actions &amp; Audit Trail
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Cryptographically signed audit logs registered under ADM-0048-COMP.
                </p>
                <div className="space-y-2 text-xs">
                  {[
                    { action: 'Updated Global Commission Tier policy (General Electronics: 8.5%)', time: '14 minutes ago', ip: '198.51.100.24' },
                    { action: 'Approved vendor KYC escalation for TechNova Ltd (TIN: 849-2180)', time: '2 hours ago', ip: '198.51.100.24' },
                    { action: 'Dispute arbitration ruling in favor of Buyer #4928 ($189.99)', time: 'Yesterday at 16:30', ip: '198.51.100.24' },
                    { action: 'Re-generated secondary YubiKey 5C backup payload certificate', time: 'Oct 12, 2025', ip: '198.51.100.89' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                      <div>
                        <p className="font-semibold text-slate-800">{log.action}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">IP: {log.ip}</p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 shrink-0">{log.time}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* =======================================================================
              Right Column (Col Span 4) - Identity, Sessions & Notifications
              ======================================================================= */}
          <div className="space-y-6 lg:col-span-4">
            {/* Card 1: ADMIN IDENTITY */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  ADMIN IDENTITY
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active Now</span>
                </span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3 h-20 w-20 rounded-full border-2 border-slate-200 bg-slate-100 p-0.5 shadow-xs">
                  <img
                    src={avatarUrl}
                    alt="Sarah Chen"
                    className="h-full w-full rounded-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <h3 className="text-base font-black text-slate-900 leading-tight">Admin User</h3>
                <p className="text-xs text-slate-500 font-medium">Sarah Chen</p>

                {/* Copyable ID */}
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Click to copy Administrator ID"
                >
                  <span className="font-mono">ADM-0048-COMP</span>
                  <Copy className="h-2.5 w-2.5 text-slate-400" />
                  {copiedId && <span className="text-[9px] text-emerald-600">Copied!</span>}
                </button>
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Role Tier</span>
                  <span className="font-bold text-slate-900">Super Administrator</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="font-mono text-slate-900 font-medium truncate max-w-[170px]">{workEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Member Since</span>
                  <span className="font-bold text-slate-900">January 14, 2024</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Security Profile</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Active 2FA</span>
                  </span>
                </div>
              </div>

              {/* Handshake note */}
              <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  LAST LOGIN HANDSHAKE
                </span>
                <p className="text-xs font-bold text-slate-900">Today at 09:42 UTC</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chrome 129 on macOS • San Francisco, US
                </p>
              </div>
            </div>

            {/* Card 2: Active Sessions */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Active Sessions
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {activeSessions.length} Devices
                </span>
              </div>

              <div className="space-y-3">
                {activeSessions.map((sess) => {
                  const Icon = sess.icon;
                  return (
                    <div
                      key={sess.id}
                      className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Icon className="h-3.5 w-3.5 text-slate-500" />
                          <span>{sess.device}</span>
                        </div>
                        {sess.isCurrent ? (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-600">{sess.os}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{sess.location}</span>
                        <span className={sess.isCurrent ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                          {sess.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsRevokeModalOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Revoke All Other Sessions</span>
              </button>
            </div>

            {/* Card 3: Notification Preferences */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-900">Notification Preferences</h3>
                <p className="text-[11px] text-slate-500">
                  Direct operational alerts for executive administrators.
                </p>
              </div>

              <div className="space-y-3.5 border-t border-slate-100 pt-3">
                {[
                  {
                    key: 'disputeAlerts' as const,
                    title: 'High Dispute Rate Alerts (>3.5%)',
                    desc: 'Instant escalation triggers for merchant anomalies',
                  },
                  {
                    key: 'kycWarnings' as const,
                    title: 'Merchant KYC SLA Warnings (<4h)',
                    desc: 'Breach risks on pending business verifications',
                  },
                  {
                    key: 'payoutSettlement' as const,
                    title: 'Payout Batch Settlement Clearance',
                    desc: 'Direct notification when multi-million batches post',
                  },
                  {
                    key: 'counterfeitFlags' as const,
                    title: 'Automated Counterfeit Flags',
                    desc: 'Machine vision trademark infringement signals',
                  },
                  {
                    key: 'systemAlerts' as const,
                    title: 'System Maintenance & Security Alerts',
                    desc: 'Infrastructure outages and root privilege attempts',
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-2">
                    <div className="min-w-0 pr-1">
                      <p className="text-xs font-bold text-slate-800 leading-snug">{item.title}</p>
                      <p className="text-[10px] text-slate-500 leading-normal">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifications[item.key]}
                      onClick={() =>
                        setNotifications((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        notifications[item.key] ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          notifications[item.key] ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Delivery Channels */}
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  DELIVERY CHANNELS
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span className="font-mono text-[11px] truncate">{workEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MessageSquare className="h-3 w-3 text-slate-400" />
                    <span className="font-mono text-[11px] truncate">ops-admin-alerts (Slack)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          Configure Keys Dialog (Modal)
          ========================================================================= */}
      <Dialog open={isKeyModalOpen} onOpenChange={setIsKeyModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Hardware Security Key &amp; Authenticator Setup
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Manage FIDO2 / WebAuthn physical security tokens and TOTP authenticator seeds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="font-bold text-slate-900">Enrolled YubiKey 5C NFC</p>
              <p className="text-slate-500 text-[11px] mt-0.5">Firmware 5.4.3 • Registered Oct 12, 2025</p>
              <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-600">
                <Check className="h-3 w-3" />
                <span>Primary Cryptographic Token Verified</span>
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsKeyModalOpen(false);
                  showToast('New hardware token registration initiated');
                }}
                className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                + Register New Token
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          Recovery Codes Dialog (Modal)
          ========================================================================= */}
      <Dialog open={isRecoveryModalOpen} onOpenChange={setIsRecoveryModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Emergency Backup Recovery Codes
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Each code can only be used once. Store these securely in an offline password safe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs font-bold text-slate-800 text-center">
              <span>9B24-A7BC</span>
              <span className="line-through text-slate-400">81CD-49E2 (Used)</span>
              <span>4C12-9F01</span>
              <span>719A-B33D</span>
              <span>32DA-89FC</span>
              <span>11A9-C54E</span>
              <span className="line-through text-slate-400">55E1-29BA (Used)</span>
              <span>88FB-019C</span>
              <span>62AC-99DE</span>
              <span>4401-B12A</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRecoveryModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    '9B24-A7BC\n4C12-9F01\n719A-B33D\n32DA-89FC\n11A9-C54E\n88FB-019C\n62AC-99DE\n4401-B12A'
                  );
                  showToast('Recovery codes copied to clipboard');
                }}
                className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Copy All Active Codes
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          Revoke Sessions Confirmation Dialog (Modal)
          ========================================================================= */}
      <Dialog open={isRevokeModalOpen} onOpenChange={setIsRevokeModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Revoke All Other Sessions?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This will immediately invalidate login tokens on all other devices (including iPhone 16 Pro). You will remain signed in only on this Mac Studio.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsRevokeModalOpen(false)}
              className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
            >
              Confirm Revoke
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspaceLayout>
  );
};
