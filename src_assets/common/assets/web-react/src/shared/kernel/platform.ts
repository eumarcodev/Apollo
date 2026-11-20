/** Values of SUNSHINE_PLATFORM reported by `GET /api/config` (cmake/compile_definitions/*.cmake). */
export const PLATFORMS = ['windows', 'linux', 'macos'] as const;

export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (PLATFORMS as readonly string[]).includes(value);
}

export function parsePlatform(value: unknown): Platform | null {
  return isPlatform(value) ? value : null;
}
