import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  ShieldOff,
  Search,
  ChevronDown,
  Download,
  Plus,
  ArrowUpDown,
  ArrowUp,
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
import { exportToCsv } from '../lib/export-csv';
import { useMarketplaceStore } from '../store/marketplace-store';
import { supabaseUsers } from '../lib/supabase-service';

interface UserRecord {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: 'Vendor Admin' | 'Vendor Staff' | 'Buyer' | 'Dispute Moderator' | 'Platform Admin';
  status: 'Active' | 'Suspended' | 'Inactive';
  totalVolume: string;
  lastActive: string;
  joinDate: string;
}

const INITIAL_USERS: UserRecord[] = [
  {
    id: 'usr-1',
    initials: 'AC',
    name: 'Abigail Clark',
    email: 'abigail.clark@vendora.market',
    role: 'Vendor Admin',
    status: 'Active',
    totalVolume: '$48,290.00',
    lastActive: '10 Nov 2025',
    joinDate: '30 Oct 2025',
  },
  {
    id: 'usr-2',
    initials: 'MV',
    name: 'Marcus Vance',
    email: 'marcus.v@apextech.io',
    role: 'Vendor Staff',
    status: 'Active',
    totalVolume: '$124,500.00',
    lastActive: 'Just now',
    joinDate: '14 Jan 2025',
  },
  {
    id: 'usr-3',
    initials: 'AH',
    name: 'Amelia Harris',
    email: 'amelia.harris@gmail.com',
    role: 'Buyer',
    status: 'Active',
    totalVolume: '$3,420.50',
    lastActive: '20 Dec 2025',
    joinDate: '10 Apr 2025',
  },
  {
    id: 'usr-4',
    initials: 'AR',
    name: 'Andrew Robinson',
    email: 'andrew.robinson@outlook.com',
    role: 'Buyer',
    status: 'Suspended',
    totalVolume: '$890.00',
    lastActive: '18 Dec 2025',
    joinDate: '22 Sept 2025',
  },
  {
    id: 'usr-5',
    initials: 'AM',
    name: 'Ava Martinez',
    email: 'ava.martinez@vendora-ops.com',
    role: 'Dispute Moderator',
    status: 'Inactive',
    totalVolume: '--',
    lastActive: '01 Dec 2025',
    joinDate: '17 Aug 2025',
  },
  {
    id: 'usr-6',
    initials: 'CJ',
    name: 'Charlotte Jackson',
    email: 'charlotte.j@urbanstyle.co',
    role: 'Vendor Admin',
    status: 'Active',
    totalVolume: '$92,140.00',
    lastActive: '17 Dec 2025',
    joinDate: '28 Feb 2025',
  },
  {
    id: 'usr-7',
    initials: 'DK',
    name: 'David Kim',
    email: 'david.kim@fintech-pay.net',
    role: 'Platform Admin',
    status: 'Active',
    totalVolume: '--',
    lastActive: 'Today, 08:30',
    joinDate: '01 Nov 2025',
  },
  {
    id: 'usr-8',
    initials: 'ER',
    name: 'Elena Rostova',
    email: 'elena.rostova@icloud.com',
    role: 'Buyer',
    status: 'Active',
    totalVolume: '$1,215.00',
    lastActive: 'Yesterday',
    joinDate: '05 Jun 2025',
  },
];

export const AdminUsersPage: React.FC = () => {
  const storeVendors = useMarketplaceStore((state) => state.vendors);
  const syncWithDatabase = useMarketplaceStore((state) => state.syncWithDatabase);

  useEffect(() => {
    syncWithDatabase();
  }, [syncWithDatabase]);

  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);

  useEffect(() => {
    let isMounted = true;
    supabaseUsers.getUsers().then((realProfiles) => {
      if (!isMounted) return;
      if (realProfiles && realProfiles.length > 0) {
        setUsers((prev) => {
          const profileIds = new Set(realProfiles.map((p) => p.id));
          return [...(realProfiles as any[]), ...prev.filter((p) => !profileIds.has(p.id))];
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (storeVendors && storeVendors.length > 0) {
      const vendorUsers: UserRecord[] = storeVendors.map((v) => {
        const initials = v.storeName
          .split(' ')
          .map((w: string) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'VA';
        return {
          id: `usr-${v.id}`,
          initials,
          name: `${v.storeName} Admin`,
          email: v.email || `${v.id}@vendora.market`,
          role: 'Vendor Admin' as const,
          status: v.status === 'suspended' ? 'Suspended' as const : 'Active' as const,
          totalVolume: '$34,820.00',
          lastActive: 'Today, 10:15',
          joinDate: v.joinedDate || '14 Jan 2025',
        };
      });

      const platformStaff = INITIAL_USERS.filter((u) => u.role !== 'Vendor Admin');
      setUsers((prev) => {
        const vendorIds = new Set(vendorUsers.map((vu) => vu.id));
        const nonVendors = prev.filter((u) => !vendorIds.has(u.id));
        return [...vendorUsers, ...nonVendors, ...platformStaff.filter((ps) => !nonVendors.some((nv) => nv.id === ps.id))];
      });
    }
  }, [storeVendors]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Users');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRecord['role']>('Buyer');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All Users' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const newStatus: UserRecord['status'] = u.status === 'Active' ? 'Suspended' : 'Active';
        try {
          useMarketplaceStore.getState().updateUserStatus(id, newStatus);
        } catch {
          // ignore
        }
        supabaseUsers.updateUserStatus(id, newStatus.toLowerCase()).catch((err) => {
          console.warn('[Supabase] Failed to update user status in DB:', err);
        });
        return { ...u, status: newStatus };
      })
    );
  };

  const handleBatchSuspend = () => {
    if (selectedIds.length === 0) return;
    setUsers((prev) =>
      prev.map((u) => {
        if (selectedIds.includes(u.id)) {
          try {
            useMarketplaceStore.getState().updateUserStatus(u.id, 'Suspended');
          } catch {}
          return { ...u, status: 'Suspended' };
        }
        return u;
      })
    );
    setSelectedIds([]);
  };

  const handleExportUsers = () => {
    exportToCsv({
      filename: `marketplace-users-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { header: 'User ID', key: 'id' },
        { header: 'Full Name', key: 'name' },
        { header: 'Email Address', key: 'email' },
        { header: 'Role', key: 'role' },
        { header: 'Account Status', key: 'status' },
        { header: 'Total Volume', key: 'totalVolume' },
        { header: 'Last Active', key: 'lastActive' },
        { header: 'Join Date', key: 'joinDate' },
      ],
      data: filteredUsers,
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    const initials = newName
      .trim()
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const newUser: UserRecord = {
      id: `usr-${Date.now()}`,
      initials: initials || 'US',
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      status: 'Active',
      totalVolume: '$0.00',
      lastActive: 'Just now',
      joinDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    try {
      useMarketplaceStore.getState().addUser({
        name: newUser.name,
        email: newUser.email,
        initials: newUser.initials,
        role: newUser.role,
        status: newUser.status,
      });
    } catch {
      // ignore
    }
    setUsers([newUser, ...users]);
    setNewName('');
    setNewEmail('');
    setIsAddUserModalOpen(false);
  };

  return (
    <WorkspaceLayout
      role="admin"
      roleBadgeText="SUPER ADMIN"
      title="User Management"
      subtitle="Manage customer accounts, vendor operators, dispute managers, and platform administrators."
      sidebar={<AdminNav />}
    >
      <div className="space-y-6 pb-12 font-sans text-slate-900">
        {/* =====================================================================
            1. Title & Header Action
            ===================================================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-outfit">
              User Management
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage customer accounts, vendor operators, dispute managers, and platform administrators.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddUserModalOpen(true)}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 text-white stroke-[2.5]" />
            <span className="text-white">Add User</span>
          </button>
        </div>

        {/* =====================================================================
            2. Top 4 KPI Metric Cards
            ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Users */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Total Users</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <Users className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {users.length.toLocaleString()}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <span>Live</span>
                <span className="text-[11px] font-normal text-slate-400">across marketplace</span>
              </div>
            </div>
          </div>

          {/* Card 2: Active Users */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Active Users</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <UserCheck className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {users.filter((u) => u.status === 'Active').length.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {users.length > 0 ? ((users.filter((u) => u.status === 'Active').length / users.length) * 100).toFixed(1) : '85.1'}% of total users
              </div>
            </div>
          </div>

          {/* Card 3: Inactive Users */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Inactive Users</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <UserX className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {users.filter((u) => u.status === 'Inactive').length.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {users.length > 0 ? ((users.filter((u) => u.status === 'Inactive').length / users.length) * 100).toFixed(1) : '12.0'}% of total users
              </div>
            </div>
          </div>

          {/* Card 4: Suspended Users */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Suspended Users</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <ShieldOff className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {users.filter((u) => u.status === 'Suspended').length.toLocaleString()}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-600">
                <span>⚠ {users.length > 0 ? ((users.filter((u) => u.status === 'Suspended').length / users.length) * 100).toFixed(1) : '2.9'}% of total users</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            3. Role Breakdown 3 Cards Row
            ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Admin & Operations */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700">Admin &amp; Operations</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">142</div>
            <div className="text-[11px] text-slate-400 mt-0.5">0.5% of total users</div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '4%' }} />
            </div>
          </div>

          {/* Card 2: Vendor Managers & Staff */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700">Vendor Managers &amp; Staff</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">3,840</div>
            <div className="text-[11px] text-slate-400 mt-0.5">13.5% of total users</div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '13.5%' }} />
            </div>
          </div>

          {/* Card 3: Marketplace Customers (Buyers) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700">Marketplace Customers (Buyers)</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">24,438</div>
            <div className="text-[11px] text-slate-400 mt-0.5">86.0% of total users</div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '86%' }} />
            </div>
          </div>
        </div>

        {/* =====================================================================
            4. Search & Filter Bar + Export
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email, or ID..."
              className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Roles filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="All Roles">All Roles</option>
                <option value="Platform Admin">Platform Admin</option>
                <option value="Vendor Admin">Vendor Admin</option>
                <option value="Vendor Staff">Vendor Staff</option>
                <option value="Dispute Moderator">Dispute Moderator</option>
                <option value="Buyer">Buyer</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="All Users">All Users</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>

            {/* Batch actions */}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBatchSuspend}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-semibold shadow-2xs hover:bg-rose-700 transition-colors"
              >
                <span>Suspend Selected ({selectedIds.length})</span>
              </button>
            )}

            {/* Export CSV button */}
            <button
              type="button"
              onClick={handleExportUsers}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            5. Users Data Table
            ===================================================================== */}
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredUsers.length > 0 &&
                        selectedIds.length === filteredUsers.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1 cursor-pointer">
                      <span>USER</span>
                      <ArrowUp className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">ROLE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">TOTAL VOLUME</th>
                  <th className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 cursor-pointer">
                      <span>LAST ACTIVE</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">JOIN DATE</th>
                  <th className="py-3 px-4 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((user) => {
                  const isSelected = selectedIds.includes(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isSelected ? 'bg-slate-50/90' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(user.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-black text-white">
                            {user.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate leading-tight">
                              {user.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-2xs">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            user.status === 'Active'
                              ? 'bg-slate-900 text-white'
                              : user.status === 'Suspended'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 text-xs">
                        {user.totalVolume}
                      </td>
                      <td className="py-3 px-4 text-center text-[11px] text-slate-500 font-medium">
                        {user.lastActive}
                      </td>
                      <td className="py-3 px-4 text-right text-[11px] text-slate-500 font-medium">
                        {user.joinDate}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user.id)}
                          className={`rounded px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                            user.status === 'Active'
                              ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {user.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none rounded border border-slate-200 bg-white pl-2 pr-6 py-1 text-xs text-slate-700 shadow-2xs cursor-pointer"
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
              <span className="ml-2">
                Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                {filteredUsers.length !== users.length && ` (filtered from ${users.length})`}
              </span>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Add User Modal */}
        <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900">
                Create Platform User
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Grant access credentials for customer accounts, vendor operators, or administrators.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateUser} className="space-y-3 py-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Liam Foster"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="liam.foster@example.com"
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">System Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRecord['role'])}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-900"
                >
                  <option value="Buyer">Buyer</option>
                  <option value="Vendor Admin">Vendor Admin</option>
                  <option value="Vendor Staff">Vendor Staff</option>
                  <option value="Dispute Moderator">Dispute Moderator</option>
                  <option value="Platform Admin">Platform Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#FF7A1A] to-[#FF9233] hover:from-[#ea6c13] hover:to-[#e88020] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                >
                  Create User
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  );
};
