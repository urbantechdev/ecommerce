/**
 * Naisiae ERP - Session & Inactivity Management
 * 
 * Rules:
 * 1. 2-Minute Inactivity Rule: If user is idle (no interaction) for 2 minutes (120,000 ms),
 *    they are automatically logged out.
 * 2. Active Session / Refresh Rule: Within the 2-minute window, the user is NOT logged out,
 *    even on page refresh. Refresh counts as active interaction.
 * 3. Manual Logout: If the user manually logs out, saved draft state is cleared so the next
 *    login starts clean.
 * 4. State Restoration: If logged out due to inactivity, the system captures their exact
 *    work context (current view, active branch, POS cart draft, selected customer, etc.).
 *    When they log back in, they are restored right where they were.
 */

export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes (120 seconds)
export const WARNING_BEFORE_TIMEOUT_MS = 25 * 1000; // Show warning during last 25 seconds of idle

const LAST_ACTIVITY_KEY = 'nais_last_activity_time';
const SESSION_SNAPSHOT_KEY = 'nais_session_snapshot';
const AUTO_TIMEOUT_FLAG_KEY = 'nais_auto_timeout_flag';
const POS_CART_KEY = 'nais_pos_cart';

export interface SessionSnapshot {
  view: string;
  activeBranchId?: string;
  posCart?: any[];
  posCustomerId?: string;
  savedAt: number;
  reason: 'inactivity_timeout' | 'refresh_preservation' | 'manual';
  userName?: string;
  userRole?: string;
  userEmail?: string;
}

/**
 * Record a user interaction event to reset the 2-minute sliding inactivity countdown
 */
let lastRecordedTime = 0;
export function recordUserActivity(): void {
  const now = Date.now();
  // Throttle writes to localStorage to at most once every 500ms for high performance
  if (now - lastRecordedTime > 500) {
    lastRecordedTime = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // Ignore localStorage quotas
    }
  }
}

/**
 * Force set current activity timestamp (e.g. immediately on login or refresh)
 */
export function touchActivityNow(): void {
  const now = Date.now();
  lastRecordedTime = now;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {
    // Ignore localStorage quotas
  }
}

/**
 * Retrieve the timestamp of the last recorded user activity
 */
export function getLastActivityTime(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return Date.now();
    const val = Number(raw);
    return isNaN(val) || val <= 0 ? Date.now() : val;
  } catch {
    return Date.now();
  }
}

/**
 * Get remaining milliseconds before inactivity timeout
 */
export function getRemainingInactivityMs(): number {
  const lastActive = getLastActivityTime();
  const elapsed = Date.now() - lastActive;
  const remaining = INACTIVITY_TIMEOUT_MS - elapsed;
  return Math.max(0, remaining);
}

/**
 * Check if the user has been inactive for 2 minutes or more
 */
export function isSessionExpiredByInactivity(): boolean {
  const lastActive = getLastActivityTime();
  const elapsed = Date.now() - lastActive;
  return elapsed >= INACTIVITY_TIMEOUT_MS;
}

/**
 * Save snapshot of user's active work before logging out due to inactivity
 */
export function saveSessionSnapshot(snapshot: Partial<SessionSnapshot>): void {
  try {
    const existing = getSessionSnapshot();
    const merged: SessionSnapshot = {
      view: snapshot.view || existing?.view || localStorage.getItem('nais_active_view') || 'pos',
      activeBranchId: snapshot.activeBranchId || existing?.activeBranchId || 'all',
      posCart: snapshot.posCart !== undefined ? snapshot.posCart : (existing?.posCart || getStoredPosCart()),
      posCustomerId: snapshot.posCustomerId || existing?.posCustomerId || 'cust-walkin',
      savedAt: Date.now(),
      reason: snapshot.reason || 'inactivity_timeout',
      userName: snapshot.userName || existing?.userName,
      userRole: snapshot.userRole || existing?.userRole,
      userEmail: snapshot.userEmail || existing?.userEmail,
    };
    localStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save session snapshot:', err);
  }
}

/**
 * Retrieve the saved session snapshot
 */
export function getSessionSnapshot(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SESSION_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear the saved session snapshot (called upon intentional manual logout or full reset)
 */
export function clearSessionSnapshot(): void {
  try {
    localStorage.removeItem(SESSION_SNAPSHOT_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Mark that the user was automatically logged out due to 2-minute inactivity
 */
export function markAutoTimedOut(details?: { view?: string; userName?: string }): void {
  try {
    localStorage.setItem(
      AUTO_TIMEOUT_FLAG_KEY,
      JSON.stringify({
        timedOutAt: Date.now(),
        view: details?.view || 'pos',
        userName: details?.userName || '',
      })
    );
  } catch {
    // Ignore
  }
}

/**
 * Check if the last logout was caused by automatic inactivity timeout
 */
export function getAutoTimeoutNotice(): { timedOutAt: number; view: string; userName: string } | null {
  try {
    const raw = localStorage.getItem(AUTO_TIMEOUT_FLAG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear the auto timeout notice flag once displayed/acknowledged or logged in
 */
export function clearAutoTimeoutNotice(): void {
  try {
    localStorage.removeItem(AUTO_TIMEOUT_FLAG_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Helper to get/set draft POS cart directly in localStorage
 */
export function getStoredPosCart(): any[] {
  try {
    const raw = localStorage.getItem(POS_CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setStoredPosCart(cart: any[]): void {
  try {
    if (cart && cart.length > 0) {
      localStorage.setItem(POS_CART_KEY, JSON.stringify(cart));
    } else {
      localStorage.removeItem(POS_CART_KEY);
    }
  } catch {
    // Ignore
  }
}

export function clearStoredPosCart(): void {
  try {
    localStorage.removeItem(POS_CART_KEY);
  } catch {
    // Ignore
  }
}
