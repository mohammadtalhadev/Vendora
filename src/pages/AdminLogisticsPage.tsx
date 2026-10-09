import React, { useState } from 'react';
import {
  Truck,
  Bike,
  AlertTriangle,
} from 'lucide-react';
import { WorkspaceLayout } from '../features/workspaces/WorkspaceLayout';
import { AdminNav } from '../features/admin/components/AdminNav';

interface FleetRider {
  id: string;
  name: string;
  phone: string;
  vehicle: 'Motorcycle' | 'Cargo Van' | 'Bicycle';
  isOnline: boolean;
  activeDeliveriesCount: number;
  completedToday: number;
  onTimeRate: number;
}

interface ActiveDelivery {
  id: string;
  subOrderId: string;
  vendorName: string;
  pickupAddress: string;
  customerName: string;
  dropoffAddress: string;
  assignedRiderId?: string;
  assignedRiderName?: string;
  status: 'assigned' | 'in_transit' | 'exception_delayed';
  etaMinutes: number;
}

const SEED_RIDERS: FleetRider[] = [
  { id: 'rider-1', name: 'Sam Express', phone: '+1 (555) 019-8821', vehicle: 'Motorcycle', isOnline: true, activeDeliveriesCount: 2, completedToday: 8, onTimeRate: 98.5 },
  { id: 'rider-2', name: 'Carlos Mendez', phone: '+1 (555) 019-3329', vehicle: 'Cargo Van', isOnline: true, activeDeliveriesCount: 3, completedToday: 11, onTimeRate: 97.2 },
  { id: 'rider-3', name: 'Maya Lin', phone: '+1 (555) 019-4410', vehicle: 'Bicycle', isOnline: true, activeDeliveriesCount: 1, completedToday: 6, onTimeRate: 100 },
  { id: 'rider-4', name: 'Tariq Al-Mansoor', phone: '+1 (555) 019-5512', vehicle: 'Motorcycle', isOnline: false, activeDeliveriesCount: 0, completedToday: 4, onTimeRate: 95.8 },
];

const SEED_ACTIVE_DELIVERIES: ActiveDelivery[] = [
  {
    id: 'del-101',
    subOrderId: 'SUB-98421-A',
    vendorName: 'Apex Audio & Gear',
    pickupAddress: '120 Industrial Pkwy, San Leandro, CA',
    customerName: 'Sarah Customer',
    dropoffAddress: '742 Evergreen Terrace, Springfield, OR',
    assignedRiderId: 'rider-1',
    assignedRiderName: 'Sam Express',
    status: 'in_transit',
    etaMinutes: 18,
  },
  {
    id: 'del-102',
    subOrderId: 'SUB-98422-B',
    vendorName: 'Matrix Apparel Hub',
    pickupAddress: '400 Fashion Blvd, Suite 12, Oakland, CA',
    customerName: 'Michael Chang',
    dropoffAddress: '1200 Lake Shore Dr, San Francisco, CA',
    assignedRiderId: 'rider-2',
    assignedRiderName: 'Carlos Mendez',
    status: 'assigned',
    etaMinutes: 35,
  },
  {
    id: 'del-103',
    subOrderId: 'SUB-98419-C',
    vendorName: 'TechCraft Devices',
    pickupAddress: '88 Mission Bay, San Francisco, CA',
    customerName: 'Jessica Taylor',
    dropoffAddress: '55 Castro St, San Francisco, CA',
    assignedRiderId: 'rider-1',
    assignedRiderName: 'Sam Express',
    status: 'exception_delayed',
    etaMinutes: 52,
  },
];

export const AdminLogisticsPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>(SEED_ACTIVE_DELIVERIES);
  const [reassignModalDel, setReassignModalDel] = useState<ActiveDelivery | null>(null);
  const [selectedNewRider, setSelectedNewRider] = useState('rider-3');

  const handleReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalDel) return;

    const riderObj = SEED_RIDERS.find((r) => r.id === selectedNewRider);
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === reassignModalDel.id
          ? {
              ...d,
              assignedRiderId: selectedNewRider,
              assignedRiderName: riderObj?.name || 'Assigned Rider',
              status: 'assigned',
            }
          : d,
      ),
    );
    setReassignModalDel(null);
  };

  const onlineCount = SEED_RIDERS.filter((r) => r.isOnline).length;

  return (
    <WorkspaceLayout role="admin" sidebar={<AdminNav />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Logistics & Fleet Dispatch Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time delivery fleet monitoring, live parcel queues, courier SLA tracking, and exception re-assignment.
          </p>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Riders</span>
            <div className="text-xl font-black text-slate-900 mt-1">{onlineCount} Online</div>
            <span className="text-[11px] text-emerald-600 font-bold">{SEED_RIDERS.length} total registered fleet</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In-Transit Parcels</span>
            <div className="text-xl font-black text-slate-900 mt-1">{deliveries.length} Packages</div>
            <span className="text-[11px] text-blue-600 font-bold">Local courier dispatch</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fleet On-Time Rate</span>
            <div className="text-xl font-black text-slate-900 mt-1">98.1%</div>
            <span className="text-[11px] text-emerald-600 font-bold">Target: &gt; 95% SLA</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Exceptions / Delays</span>
            <div className="text-xl font-black text-rose-600 mt-1">1 Flagged</div>
            <span className="text-[11px] text-rose-600 font-bold">Requires courier re-assignment</span>
          </div>
        </div>

        {/* Fleet Riders List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bike className="h-4 w-4 text-[#FF7A1A]" />
            Registered Delivery Couriers & Shift Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {SEED_RIDERS.map((r) => (
              <div key={r.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{r.name}</span>
                  <span className={`h-2 w-2 rounded-full ${r.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                </div>
                <div className="text-slate-500 text-[11px] space-y-0.5">
                  <p>Vehicle: <strong>{r.vehicle}</strong></p>
                  <p>Shift: <strong className={r.isOnline ? 'text-emerald-700' : 'text-slate-500'}>{r.isOnline ? 'On Duty' : 'Offline'}</strong></p>
                  <p>On-Time SLA: <strong className="text-slate-800">{r.onTimeRate}%</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Deliveries Queue Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#FF7A1A]" />
            Live Active Dispatch Queue
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="p-3">Sub-Order</th>
                  <th className="p-3">Vendor Origin</th>
                  <th className="p-3">Destination Customer</th>
                  <th className="p-3">Assigned Courier</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">ETA</th>
                  <th className="p-3 text-right">Dispatch Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-slate-900">{d.subOrderId}</td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800 block">{d.vendorName}</span>
                      <span className="text-slate-400 text-[11px] truncate block max-w-xs">{d.pickupAddress}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800 block">{d.customerName}</span>
                      <span className="text-slate-400 text-[11px] truncate block max-w-xs">{d.dropoffAddress}</span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{d.assignedRiderName}</td>
                    <td className="p-3">
                      {d.status === 'in_transit' && (
                        <span className="rounded-full bg-orange-100 text-[#FF7A1A] px-2.5 py-0.5 text-[10px] font-bold">
                          In Transit
                        </span>
                      )}
                      {d.status === 'assigned' && (
                        <span className="rounded-full bg-purple-100 text-purple-700 px-2.5 py-0.5 text-[10px] font-bold">
                          Assigned
                        </span>
                      )}
                      {d.status === 'exception_delayed' && (
                        <span className="rounded-full bg-rose-100 text-rose-700 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          SLA Delayed
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-900">{d.etaMinutes} mins</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setReassignModalDel(d)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Re-assign Rider
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Re-assign Rider */}
        {reassignModalDel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 text-xs">
              <h3 className="text-base font-bold text-slate-900 mb-1">Re-assign Delivery Courier</h3>
              <p className="text-slate-500 mb-4">
                Re-assigning parcel <strong className="font-mono">{reassignModalDel.subOrderId}</strong> from {reassignModalDel.assignedRiderName}.
              </p>

              <form onSubmit={handleReassign} className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Available Courier</label>
                  <select
                    value={selectedNewRider}
                    onChange={(e) => setSelectedNewRider(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-900"
                  >
                    {SEED_RIDERS.filter((r) => r.isOnline).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.vehicle}) • {r.activeDeliveriesCount} active deliveries
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReassignModalDel(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#FF7A1A] px-4 py-2 font-bold text-white shadow-sm hover:bg-[#EA580C]"
                  >
                    Confirm Re-assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};
