const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? '';

/**
 * Returns a usable <img> src from whatever is stored in the avatar field:
 *   - "data:image/..." base64 → returned as-is
 *   - "/uploads/..."  file path → prepended with the API base URL
 *   - anything else (initials like "AB") → empty string (caller shows text fallback)
 */
export function avatarSrc(avatar: string | undefined | null): string {
  if (!avatar) return '';
  if (avatar.startsWith('data:')) return avatar;
  if (avatar.startsWith('/')) return `${API_BASE}${avatar}`;
  return '';
}
