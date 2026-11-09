import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat, type ImageManipulatorContext, type ImageRef } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import {
  parseRecognitionImage,
  type RecognitionImage,
} from "../../supabase/functions/_shared/vision-contract";

export type PreparedPhoto = RecognitionImage & { uri: string };

export class PhotoError extends Error {}

/** Só remove cópias em cache, nunca content://, ph:// ou arquivos originais. */
export function discardPhoto(photo: { uri: string } | null): void {
  if (!photo) return;
  if (Platform.OS === "web") {
    if (photo.uri.startsWith("blob:")) URL.revokeObjectURL(photo.uri);
    return;
  }
  const cache = `${Paths.cache.uri.replace(/\/$/, "")}/`;
  if (!photo.uri.startsWith(cache)) return;
  try {
    const file = new File(photo.uri);
    if (file.exists) file.delete();
  } catch { /* O SO também pode remover arquivos de cache entre seleção e limpeza. */ }
}

export async function preparePhoto(asset: ImagePicker.ImagePickerAsset): Promise<PreparedPhoto> {
  let context: ImageManipulatorContext | undefined;
  let rendered: ImageRef | undefined;
  let saved: { uri: string } | null = null;
  try {
    context = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > 1600) {
      context.resize(asset.width >= asset.height ? { width: 1600 } : { height: 1600 });
    }
    rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    saved = result;
    const image = parseRecognitionImage({ imageBase64: result.base64, mimeType: "image/jpeg" });
    return { ...image, uri: result.uri };
  } catch (error) {
    discardPhoto(saved);
    throw error;
  } finally {
    rendered?.release();
    context?.release();
    if (asset.uri !== saved?.uri) discardPhoto(asset);
  }
}

export async function choosePhoto(source: "camera" | "library"): Promise<PreparedPhoto | null> {
  if (source === "camera" && Platform.OS !== "web") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new PhotoError("Permita o uso da câmera nas configurações do aparelho ou escolha uma foto da galeria.");
    }
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"], allowsMultipleSelection: false, allowsEditing: false,
    quality: 1, exif: false, base64: false,
  };
  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return preparePhoto(result.assets[0]);
}

/** Recupera apenas a prévia; nunca envia automaticamente após recriação da Activity. */
export async function recoverPendingPhoto(): Promise<PreparedPhoto | null> {
  if (Platform.OS !== "android") return null;
  const result = await ImagePicker.getPendingResultAsync();
  if (!result || "code" in result || result.canceled || !result.assets[0]) return null;
  return preparePhoto(result.assets[0]);
}
