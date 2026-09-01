export const LEGACY_STORAGE_KEY = 'luma-character-chat:v1';

/** Remove only the previous prototype's seeded localStorage snapshot. */
export function removeLegacyDemoState(storage: Storage): void {
  storage.removeItem(LEGACY_STORAGE_KEY);
}
