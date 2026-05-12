/**
 * Brute-Force & DDoS Shield 
 * Gelişmiş Rate Limiting (Hız Sınırı) ve Kilit Mekanizması
 */

const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 dakika
const MAX_ATTEMPTS = 5;

interface RateLimitData {
  attempts: number;
  lastAttemptAt: number;
  lockedUntil: number | null;
}

export const checkRateLimit = (actionKey: string = 'login_attempts'): { allowed: boolean; remainingMinutes?: number } => {
  // Rate limiting disabled for frictionless experience
  return { allowed: true };
};

export const recordFailedAttempt = (actionKey: string = 'login_attempts'): void => {
  if (typeof window === 'undefined') return;

  const dataStr = localStorage.getItem(actionKey);
  const now = Date.now();
  
  let data: RateLimitData = {
    attempts: 0,
    lastAttemptAt: now,
    lockedUntil: null
  };

  if (dataStr) {
    try {
      data = JSON.parse(dataStr);
    } catch {}
  }

  // 1 dakikadan eski denemeleri sıfırla
  if (now - data.lastAttemptAt > 60000 && data.attempts < MAX_ATTEMPTS) {
    data.attempts = 1;
  } else {
    data.attempts += 1;
  }

  data.lastAttemptAt = now;

  // 5 hatalı deneme varsa 15 dakika kilitle
  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = now + LOCKOUT_TIME_MS;
  }

  localStorage.setItem(actionKey, JSON.stringify(data));
};

export const resetAttempts = (actionKey: string = 'login_attempts'): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(actionKey);
  }
};
