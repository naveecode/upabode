// In-memory OTP store for email verification and cyber protection

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

const globalForOtp = global as unknown as { otpStore?: Map<string, OtpRecord> };
const otpStore = globalForOtp.otpStore || new Map<string, OtpRecord>();
if (process.env.NODE_ENV !== 'production') globalForOtp.otpStore = otpStore;

export function generateAndStoreOtp(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  // Generate 6-digit numeric OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

  otpStore.set(normalizedEmail, {
    code,
    expiresAt,
    attempts: 0,
    verified: false
  });

  console.log(`\n========================================\n[ORBIT SECURE OTP] Code for ${normalizedEmail}: ${code}\n========================================\n`);

  return code;
}

export function verifyOtp(email: string, inputCode: string): { valid: boolean; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const record = otpStore.get(normalizedEmail);

  if (!record) {
    return { valid: false, error: 'No verification code found. Please request a new code.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: 'Verification code has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (record.code !== inputCode.trim()) {
    record.attempts++;
    return { valid: false, error: `Invalid verification code. ${5 - record.attempts} attempts remaining.` };
  }

  record.verified = true;
  return { valid: true };
}

export function isOtpVerified(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const record = otpStore.get(normalizedEmail);
  return !!record && record.verified && Date.now() <= record.expiresAt;
}

export function clearOtp(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  otpStore.delete(normalizedEmail);
}
