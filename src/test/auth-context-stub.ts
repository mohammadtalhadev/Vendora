import { vi } from 'vitest';

/**
 * The workspace shells (WorkspaceLayout, AdminNav) take sign-out from the auth context,
 * which needs a provider plus a live session. Render and navigation tests never click
 * sign-out, so they replace the module with this stub rather than booting the provider.
 */
export function useAuthStub() {
  return { signOut: vi.fn(async () => undefined) };
}
