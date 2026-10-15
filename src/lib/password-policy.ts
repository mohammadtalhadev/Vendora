/**
 * The single password policy for NEW passwords.
 *
 * Every surface that creates a password — customer registration, seller
 * registration, password reset, account settings, admin profile — enforces
 * this one rule, the API schemas validate against it, and
 * `supabase/config.toml` (`minimum_password_length`) mirrors it for local
 * development. The hosted project's Auth setting must be raised to the
 * same value in the dashboard; until then the client and schema checks
 * are the enforcing layer a visitor actually meets.
 *
 * Sign-in deliberately does NOT enforce this: an account created under an
 * older, weaker rule must still be able to log in and then update its
 * password. Login pages only require a non-empty password.
 */
export const PASSWORD_MIN_LENGTH = 8;

/** Returns the error to show for a new password, or null when it passes. */
export function validateNewPassword(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  return null;
}
