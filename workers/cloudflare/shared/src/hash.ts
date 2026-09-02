export async function sha256Hex(data: BufferSource | Uint8Array | string): Promise<string> {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

export async function valueHash(fieldKey: string, normalizedValue: string): Promise<string> {
  return sha256Hex(`${fieldKey}\0${normalizedValue}`);
}
