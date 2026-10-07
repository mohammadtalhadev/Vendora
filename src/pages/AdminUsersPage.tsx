import React, { useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Users');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredUsers = INITIAL_USERS.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All Users' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              User Management
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage customer accounts, vendor operators, dispute managers, and platform administrators.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add User</span>
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
                28,420
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <span>↑ +12.4%</span>
                <span className="text-[11px] font-normal text-slate-400">from last month</span>
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
                24,180
              </div>
              <div className="mt-1 text-xs text-slate-400">
                85.1% of total users
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
                3,412
              </div>
              <div className="mt-1 text-xs text-slate-400">
                12.0% of total users
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
                828
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-600">
                <span>⚠ 2.9% of total users</span>
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

            {/* Export CSV button */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
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
                <select className="appearance-none rounded border border-slate-200 bg-white pl-2 pr-6 py-1 text-xs text-slate-700 shadow-2xs cursor-pointer">
                  <option value="8">8</option>
                  <option value="16">16</option>
                  <option value="32">32</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
              <span className="ml-2">
                Showing 1-{filteredUsers.length} of 28,420 users total
              </span>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                disabled
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs"
              >
                1
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                2
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                3
              </button>
              <span className="px-1 text-slate-400">...</span>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                355
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};
