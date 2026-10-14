import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Guard contracts (Batch 24): the default unauthenticated redirect stays the
 * customer /login, while a route that names its own loginPath/deniedPath —
 * the admin workspace with /admin/login — uses those instead.
 */
const auth = vi.hoisted(() => ({
  user: null as null | { id: string; roles: string[] },
}));

vi.mock('../../lib/auth-context', () => ({
  useAuth: () => ({
    user: auth.user,
    loading: false,
    hasRole: (role: string) => auth.user?.roles.includes(role) ?? false,
  }),
}));

import { ProtectedRoute } from './ProtectedRoute';

function LocationProbe() {
  const location = useLocation();
  return <div>{`LOC:${location.pathname}${location.search}`}</div>;
}

function renderGuarded(kind: 'default' | 'staff') {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route
          path="/secret"
          element={
            kind === 'staff' ? (
              <ProtectedRoute allowedRoles={['admin']} loginPath="/admin/login" deniedPath="/admin/login?denied=1">
                <div>SECRET</div>
              </ProtectedRoute>
            ) : (
              <ProtectedRoute allowedRoles={['admin']}>
                <div>SECRET</div>
              </ProtectedRoute>
            )
          }
        />
        <Route path="/login" element={<LocationProbe />} />
        <Route path="/admin/login" element={<LocationProbe />} />
        <Route path="/403" element={<div>FORBIDDEN PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    auth.user = null;
  });

  it('default: unauthenticated visitors go to the customer /login with a redirect back', () => {
    renderGuarded('default');

    expect(screen.getByText('LOC:/login?redirect=%2Fsecret')).toBeInTheDocument();
  });

  it('staff: unauthenticated visitors go to /admin/login, not the customer /login', () => {
    renderGuarded('staff');

    expect(screen.getByText('LOC:/admin/login?redirect=%2Fsecret')).toBeInTheDocument();
  });

  it('default: an authenticated user without the role gets the /403 page', () => {
    auth.user = { id: 'u1', roles: ['customer'] };
    renderGuarded('default');

    expect(screen.getByText('FORBIDDEN PAGE')).toBeInTheDocument();
  });

  it('staff: an authenticated non-staff user is sent to the staff denial', () => {
    auth.user = { id: 'u1', roles: ['customer'] };
    renderGuarded('staff');

    expect(screen.getByText('LOC:/admin/login?denied=1')).toBeInTheDocument();
  });

  it('an authenticated user with the role sees the page', () => {
    auth.user = { id: 'u2', roles: ['admin'] };
    renderGuarded('staff');

    expect(screen.getByText('SECRET')).toBeInTheDocument();
  });
});
