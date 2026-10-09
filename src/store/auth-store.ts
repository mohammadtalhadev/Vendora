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
  login: (email: string, password?: string) => User;
  register: (name: string, email: string, password?: string) => User;
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

      login: (email: string) => {
        const normalized = email.trim().toLowerCase();
        // Check matching demo account
        const matchedEntry = Object.values(DEMO_ACCOUNTS).find(
          (u) => u.email.toLowerCase() === normalized,
        );

        const authenticatedUser: User = matchedEntry || {
          id: `usr-${Date.now()}`,
          email: normalized,
          name: normalized.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          roles: ['customer'],
          vendorStatus: 'none',
        };

        const mockToken = `mock-jwt-${authenticatedUser.id}-${Date.now()}`;
        set({
          user: authenticatedUser,
          token: mockToken,
          isAuthenticated: true,
        });

        return authenticatedUser;
      },

      register: (name: string, email: string) => {
        const normalized = email.trim().toLowerCase();
        const newUser: User = {
          id: `usr-${Date.now()}`,
          name: name.trim(),
          email: normalized,
          roles: ['customer'],
          vendorStatus: 'none',
        };

        const mockToken = `mock-jwt-${newUser.id}-${Date.now()}`;
        set({
          user: newUser,
          token: mockToken,
          isAuthenticated: true,
        });

        return newUser;
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
