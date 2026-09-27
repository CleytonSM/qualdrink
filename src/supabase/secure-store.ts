import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHUNK_SIZE = 1800;

function supportedPlatform(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

function countKey(key: string): string {
  return `${key}.n`;
}

function chunkKey(key: string, index: number): string {
  return `${key}.${index}`;
}

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  if (raw === null) {
    return 0;
  }
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 0) {
    return 0;
  }
  return count;
}

export const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (!supportedPlatform()) {
      return null;
    }
    const count = await readCount(key);
    if (count === 0) {
      return null;
    }
    const parts: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, index));
      if (part === null) {
        return null;
      }
      parts.push(part);
    }
    return parts.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!supportedPlatform()) {
      return;
    }
    const previous = await readCount(key);
    const chunks: string[] = [];
    for (let start = 0; start < value.length; start += CHUNK_SIZE) {
      chunks.push(value.slice(start, start + CHUNK_SIZE));
    }
    if (chunks.length === 0) {
      chunks.push("");
    }
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      if (chunk === undefined) {
        continue;
      }
      await SecureStore.setItemAsync(chunkKey(key, index), chunk);
    }
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    for (let index = chunks.length; index < previous; index += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, index));
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!supportedPlatform()) {
      return;
    }
    const count = await readCount(key);
    for (let index = 0; index < count; index += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, index));
    }
    await SecureStore.deleteItemAsync(countKey(key));
  },
};
