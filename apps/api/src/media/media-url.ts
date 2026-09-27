/** Public URL of a stored object: CDN / S3 base + key (media rows store keys, never URLs). */
export function mediaUrl(publicBaseUrl: string, key: string): string {
  return `${publicBaseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}
