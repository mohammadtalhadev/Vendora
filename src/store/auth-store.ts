import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole } from '../types/domain';

export const DEMO_ACCOUNTS: Record<string, User> = {
  customer: {
    id: 'usr-customer-1',
    email: 'customer@demo.test',
    name: 'Sarah Customer',
    roles: ['customer'],
    vendorStatus: 'none',
  },
  newuser: {
    id: 'usr-newuser-1',
    email: 'newuser@demo.test',
    name: 'Alex Potential Vendor',
    roles: ['customer'],
    vendorStatus: 'none',
  },
  vendor: {
    id: 'usr-vendor-1',
    email: 'vendor@demo.test',
    name: 'Marcus Tech Seller',
    roles: ['customer', 'vendor'],
    vendorStatus: 'approved',
    vendorId: 'vendor-tech-1',
  },
  admin: {
    id: 'usr-admin-1',
    email: 'admin@demo.test',
    name: 'Elena Administrator',
    roles: ['admin', 'customer'],
    vendorStatus: 'none',
  },
  support: {
    id: 'usr-support-1',
    email: 'support@demo.test',
    name: 'Jordan Support Lead',
    roles: ['support'],
    vendorStatus: 'none',
  },
  rider: {
    id: 'usr-rider-1',
    email: 'rider@demo.test',
    name: 'Sam Express Rider',
    roles: ['rider'],
    vendorStatus: 'none',
  },
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loginAsDemoRole: (roleKey: 'customer' | 'newuser' | 'vendor' | 'admin' | 'support' | 'rider') => void;
  setUser: (user: User, token?: string) => void;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      loginAsDemoRole: (roleKey) => {
        const demoUser = DEMO_ACCOUNTS[roleKey];
        if (!demoUser) return;
        const mockToken = `mock-jwt-${demoUser.id}-${Date.now()}`;
        set({
          user: demoUser,
          token: mockToken,
          isAuthenticated: true,
        });
      },

      setUser: (user, token) => {
        const generatedToken = token || `mock-jwt-${user.id}-${Date.now()}`;
        set({
          user,
          token: generatedToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      hasRole: (role) => {
        const { user } = get();
        return user ? user.roles.includes(role) : role === 'guest';
      },
    }),
    {
      name: 'vd:v1:auth_session',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
