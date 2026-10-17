// Email validation utility for Upabode
// Enforces prestigious email providers and blocks dot-spoofed temp/burner emails

const ALLOWED_DOMAINS = new Set([
  // Google
  'gmail.com',
  'googlemail.com',

  // Microsoft
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',

  // Yahoo
  'yahoo.com',
  'ymail.com',
  'yahoo.co.uk',
  'yahoo.in',
  'yahoo.ca',
  'yahoo.fr',

  // Proton
  'proton.me',
  'protonmail.com',

  // Apple
  'icloud.com',
  'me.com',
  'mac.com',

  // Other Prestigious Providers
  'zoho.com',
  'aol.com',
  'mail.com',
]);

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  normalizedEmail?: string;
}

export function validateEmail(rawEmail: string): EmailValidationResult {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { valid: false, error: 'Email address is required.' };
  }

  const trimmed = rawEmail.trim().toLowerCase();

  // Basic format check
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const [localPart, domain] = parts;

  if (!localPart || !domain) {
    return { valid: false, error: 'Invalid email address format.' };
  }

  // 1. Check for dots in local name (anti-burner Gmail dot trick: e.g. u.s.e.r@gmail.com)
  if (localPart.includes('.')) {
    return {
      valid: false,
      error: 'Temporary/dot-aliased email addresses (names with dots) are not accepted. Please use your direct email name without dots.',
    };
  }

  // 2. Check for plus addressing (e.g. user+1@gmail.com)
  if (localPart.includes('+')) {
    return {
      valid: false,
      error: 'Aliased email addresses (containing "+") are not accepted. Please provide your canonical address.',
    };
  }

  // 3. Check for legitimate / prestigious domain
  const isEdu = domain.endsWith('.edu') || domain.endsWith('.ac.uk') || domain.endsWith('.edu.in');
  const isAllowedDomain = ALLOWED_DOMAINS.has(domain) || isEdu;

  if (!isAllowedDomain) {
    return {
      valid: false,
      error: `Email provider (@${domain}) is not authorized. Please use a recognized provider (Gmail, Outlook, Yahoo, Proton, iCloud, Zoho, or .edu).`,
    };
  }

  return {
    valid: true,
    normalizedEmail: trimmed,
  };
}
