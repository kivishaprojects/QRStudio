// Per-user service entitlements. A user's access to a feature is either an explicit
// admin override (stored in qr_profiles.features) or, when no override exists, the
// plan default. Pro unlocks everything by default; admins can grant/revoke per user.

export const FEATURES = [
  { key: "bulk", label: "Bulk generation" },
  { key: "api", label: "API access" },
];

export function planDefault(plan /*, key */) {
  return plan === "pro";
}

// True if the user can use the feature (override wins, else plan default).
export function hasFeature(profile, key) {
  if (!profile) return false;
  const f = profile.features || {};
  if (Object.prototype.hasOwnProperty.call(f, key) && f[key] !== null && f[key] !== undefined) return !!f[key];
  return planDefault(profile.plan, key);
}

// Detailed state for the admin UI.
export function featureState(profile, key) {
  const f = (profile && profile.features) || {};
  const has = Object.prototype.hasOwnProperty.call(f, key) && f[key] !== null && f[key] !== undefined;
  return {
    effective: hasFeature(profile, key),
    overridden: has,
    override: has ? !!f[key] : null,
    planDefault: planDefault(profile && profile.plan, key),
  };
}
