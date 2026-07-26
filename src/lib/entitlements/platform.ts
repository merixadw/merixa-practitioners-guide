import { Capacitor } from "@capacitor/core";

/** True when running inside a Capacitor native shell (iOS/Android). */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** iOS-only billing in v1. */
export function isNativeIos(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}
