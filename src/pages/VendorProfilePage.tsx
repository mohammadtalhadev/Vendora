import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Lock,
  ShieldCheck,
  LogOut,
  KeyRound,
  Store,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { VendorNav } from '../features/vendor/components/VendorNav';
import { useAuth } from '../lib/auth-context';
import { updatePassword, updateProfileIdentity } from '../features/auth/api/session';
import { useVendorStore } from '../features/vendor/hooks/useVendorStore';

type Tab = 'identity' | 'security' | 'access';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'identity', label: 'Your Identity', icon: User },
  { id: 'security', label: 'Password & Session', icon: Lock },
  { id: 'access', label: 'What You Can Change', icon: ShieldCheck },
];

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-2xs space-y-4';
const FIELD =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400';
const LABEL = 'mb-1 block text-[11px] font-bold text-slate-700';

const VENDOR_STATUS: Record<string, string> = {
  none: 'Not applied',
  pending: 'Application in review',
  approved: 'Approved seller',
  rejected: 'Application rejected',
  suspended: 'Suspended',
};

function dateTime(value?: string | null): string {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString();
}

export const VendorProfilePage: React.FC = () => {
  const { user, session, signOut, refreshUser } = useAuth();
  const storeQuery = useVendorStore();

  const [tab, setTab] = useState<Tab>('identity');
  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The profile row is the authority for these fields, so a later write or a re-read wins.
  useEffect(() => {
    setName(user?.name ?? '');
    setAvatar(user?.avatar ?? '');
  }, [user?.name, user?.avatar]);

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
      await updateProfileIdentity({ name: trimmed, avatar: avatar.trim() });
      await refreshUser();
      showSaved('Your name and avatar are saved and shown across the workspace.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
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
      showSaved('Password updated. Existing sessions keep working until they expire.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const store = storeQuery.data;

  return (
    <WorkspaceLayout role="vendor" sidebar={<VendorNav />}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Seller Account
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            The person signed in, not the storefront. Store name, description, branding and
            support contacts are edited on{' '}
            <Link to="/vendor/store-settings" className="font-bold text-slate-700 hover:underline">
              Store Settings
            </Link>
            .
          </p>
        </div>

        {banner && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {banner}
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setError(null);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                tab === id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 space-y-6">
            {tab === 'identity' && (
              <section className={CARD}>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">Profile details</h2>
                  <p className="text-[11px] text-slate-500">
                    Written to your own row in <code>profiles</code>. The row-level policy lets you
                    change the display name and avatar, and refuses any write that touches your
                    roles.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {avatar.trim() ? (
                      <img src={avatar.trim()} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg font-black text-slate-400">
                        {(name.trim() || user?.email || '?').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    The avatar is a URL. Files you upload on{' '}
                    <Link to="/vendor/media" className="font-bold text-slate-700 hover:underline">
                      Files &amp; Media
                    </Link>{' '}
                    give you a URL to paste here; a base64 image would bloat every read of this
                    row.
                  </p>
                </div>

                <div>
                  <label className={LABEL} htmlFor="profile-name">
                    Display name
                  </label>
                  <input
                    id="profile-name"
                    className={FIELD}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div>
                  <label className={LABEL} htmlFor="profile-avatar">
                    Avatar URL
                  </label>
                  <input
                    id="profile-avatar"
                    className={FIELD}
                    placeholder="https://…"
                    value={avatar}
                    onChange={(event) => setAvatar(event.target.value)}
                  />
                </div>

                <div>
                  <span className={LABEL}>Sign-in email</span>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                    {user?.email ?? '—'}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Read-only here. This column mirrors the credential you authenticate with, and a
                    client-side edit would leave the two disagreeing, so a staff member changes it.
                  </p>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={saveIdentity}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sun-orange px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-sun-orange-600 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Save identity
                  </button>
                </div>
              </section>
            )}

            {tab === 'security' && (
              <>
                <section className={CARD}>
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">Change password</h2>
                    <p className="text-[11px] text-slate-500">
                      Sent to the auth server as an update on this session. There is no
                      current-password field because the session itself is the proof; the server's
                      own minimum length decides whether a passcode is accepted, and its message
                      appears above if not.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor="new-password">
                        New password
                      </label>
                      <input
                        id="new-password"
                        type="password"
                        className={FIELD}
                        autoComplete="new-password"
                        value={nextPassword}
                        onChange={(event) => setNextPassword(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="confirm-password">
                        Confirm new password
                      </label>
                      <input
                        id="confirm-password"
                        type="password"
                        className={FIELD}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={savePassword}
                      disabled={busy || !nextPassword || !confirmPassword}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                      Update password
                    </button>
                  </div>
                </section>

                <section className={CARD}>
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">This device</h2>
                    <p className="text-[11px] text-slate-500">
                      The session the workspace is running on right now.
                    </p>
                  </div>

                  <dl className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-500">Signed in</dt>
                      <dd className="font-bold text-slate-900">
                        {dateTime(session?.user.last_sign_in_at)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-500">Account created</dt>
                      <dd className="font-bold text-slate-900">{dateTime(session?.user.created_at)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-500">Email confirmed</dt>
                      <dd className="font-bold text-slate-900">
                        {dateTime(session?.user.email_confirmed_at)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex justify-end border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 shadow-2xs transition-all hover:bg-rose-50 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out of this device
                    </button>
                  </div>
                </section>
              </>
            )}

            {tab === 'access' && (
              <section className={CARD}>
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-slate-900">Roles on this account</h2>
                  <p className="text-[11px] text-slate-500">
                    Read from <code>profiles.roles</code> on every app start. The JWT carries no
                    roles, so what you see here is what the database authorizes.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(user?.roles ?? []).map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-700"
                    >
                      {role}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Seller application
                    </span>
                    <p className="mt-0.5 text-sm font-black text-slate-900">
                      {VENDOR_STATUS[user?.vendorStatus ?? 'none'] ?? user?.vendorStatus}
                    </p>
                    {user?.rejectionReason && (
                      <p className="mt-1 text-[11px] text-rose-700">{user.rejectionReason}</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Store record
                    </span>
                    <p className="mt-0.5 text-sm font-black text-slate-900">
                      {store ? store.storeName : storeQuery.isPending ? 'Loading…' : 'No store row'}
                    </p>
                    {store && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        {store.status === 'active' ? 'Active' : 'Suspended'} ·{' '}
                        {store.sellerType === 'platform' ? 'Platform seller' : 'Vendor seller'} ·
                        opened {new Date(store.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Frozen against a seller write
                  </span>
                  <p className="text-[11px] text-slate-500">
                    <code>profiles.roles</code> (which is what grants vendor, admin or rider
                    access), <code>vendor_profiles.status</code>, <code>rating</code>,{' '}
                    <code>review_count</code> and <code>commission_rate_override</code>. A policy
                    compares each against the stored value, so a settings form cannot edit its way
                    back from a suspension or a higher commission.
                  </p>
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <section className={CARD}>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Account
              </span>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-base font-black text-slate-400">
                      {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{user?.name || '—'}</p>
                  <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Account id <span className="font-mono">{user?.id ?? '—'}</span>
              </p>
              {store && (
                <p className="text-[11px] text-slate-500">
                  Store handle <span className="font-mono">/{store.slug}</span>
                </p>
              )}
            </section>

            <section className={CARD}>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Store className="h-4 w-4 text-[#FF7A1A]" />
                <h3 className="text-sm font-bold text-slate-900">Not built in this project</h3>
              </div>
              <ul className="space-y-2 text-[11px] text-slate-500">
                <li className="flex gap-2">
                  <span className="text-slate-300">—</span>
                  <span>
                    Two-factor or hardware-key enrolment. This project has no authenticator factors
                    and no recovery-code table, so nothing here would be verified.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-300">—</span>
                  <span>
                    A list of other devices. Enumerating sessions needs the server-side admin API; a
                    browser token can only end its own session.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-300">—</span>
                  <span>
                    A login or activity history you can read. The audit log is written by the
                    database and its policy opens it to staff only.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-300">—</span>
                  <span>
                    Staff members, sub-accounts or per-user permissions. There is no team table -
                    one account owns this store.
                  </span>
                </li>
              </ul>
              <Link
                to="/vendor/store-settings"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Store Settings for storefront, policies and alerts
              </Link>
            </section>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
