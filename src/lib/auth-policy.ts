// Domain Authentication Policy
// ============================

// NOTE: Domain restriction is currently disabled to allow all email domains.
// To re-enable, uncomment the domain check in isEmailAllowedForRegistration below.
export const ALLOWED_UNIVERSITY_DOMAIN = "brainwareuniversity.ac.in";

/*
// Optional env-configured test emails (comma separated in VITE_ALLOWED_TEST_EMAILS in .env)
const envTestEmails = (import.meta.env.VITE_ALLOWED_TEST_EMAILS || "")
  .split(",")
  .map((e: string) => e.toLowerCase().trim())
  .filter(Boolean);
*/

/**
 * Checks if a given email is permitted for NEW user registration.
 * Currently allows ALL email domains.
 * To restrict to university emails only, uncomment the domain check below.
 */
export const isEmailAllowedForRegistration = (email?: string | null): boolean => {
  if (!email) return false;
  // const normalized = email.toLowerCase().trim();
  // return normalized.endsWith(`@${ALLOWED_UNIVERSITY_DOMAIN}`);
  return true; // Allow all email domains
};
