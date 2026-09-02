/** Copy the exact view so crypto.subtle.digest cannot hash a larger backing store. */
export function exactByteCopy(data: BufferSource | Uint8Array | string): Uint8Array {
  if (typeof data === "string") return new TextEncoder().encode(data);
  if (data instanceof Uint8Array) {
    return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
  }
  const buffer = data as ArrayBuffer;
  return new Uint8Array(buffer.slice(0, buffer.byteLength));
}

export async function sha256Hex(data: BufferSource | Uint8Array | string): Promise<string> {
  const bytes = exactByteCopy(data);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

export async function valueHash(fieldKey: string, normalizedValue: string): Promise<string> {
  return sha256Hex(`${fieldKey}\0${normalizedValue}`);
}
