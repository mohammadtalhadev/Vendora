import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  ShieldCheck,
  LogOut,
  KeyRound,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';
import { useAuth } from '../lib/auth-context';
import {
  signOutEverywhere,
  updatePassword,
  updateProfileIdentity,
} from '../features/auth/api/session';
import { uploadAvatar } from '../features/account/api/avatar';
import { MfaSettingsCard } from '../features/auth/components/MfaSettingsCard';

/**
 * Admin profile (/admin/profile). Everything on this page is the signed-in
 * admin's real account: the name and avatar save to the profiles row through
 * the same helpers the customer and vendor profile pages use, the password
 * changes through Supabase Auth, and the roles shown are the account's actual
 * roles. (replaced a mock version that carried an invented phone
 * number, job title, session list and audit entries, and saved nothing.)
 */

type Tab = 'identity' | 'security' | 'access';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'identity', label: 'Your Identity', icon: User },
  { id: 'security', label: 'Password & Sessions', icon: Lock },
  { id: 'access', label: 'Your Access', icon: ShieldCheck },
];

const CARD = 'rounded-xl border border-slate-200/90 bg-white p-5 text-xs shadow-2xs space-y-4';
const FIELD =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400';
const LABEL = 'mb-1 block text-[11px] font-bold text-slate-700';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full platform administration: users, roles, settings, payouts and moderation.',
  support: 'Support desk: disputes and customer cases.',
  vendor: 'Seller workspace for a linked store.',
  rider: 'Rider workspace: assigned deliveries.',
  customer: 'Customer account: orders, wishlist and addresses.',
};

export const AdminProfilePage: React.FC = () => {
  const { user, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('identity');
  const [name, setName] = useState(user?.name ?? '');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  // The profile row is the authority for these fields, so a re-read wins.
  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const showSaved = (message: string) => {
    setError(null);
    setBanner(message);
    window.setTimeout(() => setBanner(null), 4000);
  };

  const saveIdentity = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Add a display name before saving.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateProfileIdentity({ name: trimmed });
      await refreshUser();
      showSaved('Your name is saved and shown across the admin workspace.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    setError(null);
    try {
      await uploadAvatar(file);
      await refreshUser();
      showSaved('Your profile photo is updated.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const savePassword = async () => {
    if (nextPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(nextPassword);
      setNextPassword('');
      setConfirmPassword('');
      showSaved('Password updated. Use it the next time you sign in.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOutEverywhere = async () => {
    setSigningOutAll(true);
    try {
      await signOutEverywhere();
      navigate('/admin/login', { replace: true });
    } catch (cause) {
      setSigningOutAll(false);
      setConfirmSignOutAll(false);
      setError((cause as Error).message);
    }
  };

  const initials = (user?.name ?? user?.email ?? 'A')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <WorkspaceLayout role="admin" roleBadgeText="SUPER ADMIN" title="Admin Profile" sidebar={<AdminNav />}>
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        <div>
          <h1 className="font-outfit text-2xl font-black text-slate-900">Admin Profile</h1>
          <p className="mt-1 text-xs text-slate-500">
            Your own account — identity, password and the access this sign-in carries.
          </p>
        </div>

        {banner && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{banner}</span>
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div role="tablist" aria-label="Admin profile sections" className="flex flex-wrap gap-2">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {tab === 'identity' && (
          <section className={CARD} aria-label="Your identity">
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 font-outfit text-base font-black text-white">
                  {initials}
                </span>
              )}
              <div className="space-y-1">
                <p className="font-outfit text-sm font-black text-slate-900">{user?.name || 'Admin'}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Mail className="h-3 w-3" aria-hidden="true" />
                  <span>{user?.email ?? ''}</span>
                </p>
                <label
                  className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:border-slate-300 ${
                    avatarBusy ? 'pointer-events-none opacity-60' : 'cursor-pointer'
                  }`}
                >
                  <Upload className="h-3 w-3" aria-hidden="true" />
                  <span>{avatarBusy ? 'Uploading…' : 'Change photo'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    aria-label="Upload a new profile photo"
                    onChange={handleAvatarPick}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="admin-profile-name">
                Display name
              </label>
              <input
                id="admin-profile-name"
                className={FIELD}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="admin-profile-email">
                Sign-in email
              </label>
              <input
                id="admin-profile-email"
                className={`${FIELD} bg-slate-50 text-slate-500`}
                value={user?.email ?? ''}
                readOnly
                aria-readonly="true"
              />
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                This is the address you sign in with. It is not edited here — an email change has to go
                through the confirmation flow so the login credential and the profile never disagree.
              </p>
            </div>

            <div>
              <span className={LABEL}>Account ID</span>
              <p className="font-mono text-[11px] text-slate-600 break-all">{user?.id ?? '—'}</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveIdentity}
                disabled={busy}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </section>
        )}

        {tab === 'security' && (
          <>
            <section className={CARD} aria-label="Change password">
              <h2 className="flex items-center gap-2 font-outfit text-sm font-black text-slate-900">
                <KeyRound className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                Change password
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="admin-new-password">
                    New password
                  </label>
                  <input
                    id="admin-new-password"
                    type="password"
                    className={FIELD}
                    value={nextPassword}
                    onChange={(event) => setNextPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="admin-confirm-password">
                    Confirm new password
                  </label>
                  <input
                    id="admin-confirm-password"
                    type="password"
                    className={FIELD}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">At least 8 characters.</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={savePassword}
                  disabled={busy}
                  className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </section>

            <section className={CARD} aria-label="Sessions">
              <h2 className="flex items-center gap-2 font-outfit text-sm font-black text-slate-900">
                <LogOut className="h-4 w-4 text-sun-orange" aria-hidden="true" />
                Sessions
              </h2>
              <p className="leading-relaxed text-slate-600">
                Signed in on a device you do not recognise? Sign out everywhere — every session for this
                account ends, including this one, and you will sign in again with your password.
              </p>
              {confirmSignOutAll ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSignOutEverywhere}
                    disabled={signingOutAll}
                    className="rounded-full bg-rose-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
                  >
                    {signingOutAll ? 'Signing out…' : 'Yes, sign out everywhere'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSignOutAll(false)}
                    className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Keep my sessions
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmSignOutAll(true)}
                    className="rounded-full border border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100 cursor-pointer"
                  >
                    Sign out everywhere
                  </button>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Sign out of this device
                  </button>
                </div>
              )}
            </section>

            {/* Two-factor management: staff hold the keys to the
                platform, so their authenticator lives beside the password. */}
            <MfaSettingsCard className={CARD} />
          </>
        )}

        {tab === 'access' && (
          <section className={CARD} aria-label="Your access">
            <h2 className="flex items-center gap-2 font-outfit text-sm font-black text-slate-900">
              <ShieldCheck className="h-4 w-4 text-sun-orange" aria-hidden="true" />
              Roles on this account
            </h2>
            <p className="leading-relaxed text-slate-600">
              These are the roles stored on your profile — the same values the workspace checks before it
              lets this sign-in in. Roles are changed from Admin → Users, never from a profile page.
            </p>
            <ul className="space-y-2">
              {(user?.roles ?? []).map((role) => (
                <li
                  key={role}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
                >
                  <div>
                    <p className="font-bold capitalize text-slate-900">{role}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                      {ROLE_DESCRIPTIONS[role] ?? 'A role recorded on this account.'}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                    Active
                  </span>
                </li>
              ))}
              {(user?.roles ?? []).length === 0 && (
                <li className="text-slate-500">No roles are recorded on this account.</li>
              )}
            </ul>
          </section>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default AdminProfilePage;
