import type { EvidenceBucket } from "./types.ts";

export type StoredObject = {
  key: string;
  bytes: Uint8Array;
  contentType?: string;
  customMetadata?: Record<string, string>;
};

export function createMemoryBucket(): EvidenceBucket & { objects: Map<string, StoredObject> } {
  const objects = new Map<string, StoredObject>();
  return {
    objects,
    async put(key, value, options) {
      objects.set(key, {
        key,
        bytes: value,
        contentType: options.contentType,
        customMetadata: options.customMetadata,
      });
    },
  };
}
