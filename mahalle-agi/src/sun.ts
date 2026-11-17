// Konum ve yön: GPS, güneş pusulası (manyetik pusula enkaz demirinden saptığında yedek).

import SunCalc from "suncalc";

export interface Fix {
  lat: number;
  lon: number;
  acc: number;
  src: number; // protocol.LOC_SRC indeksi
}

export function getGps(timeoutMs = 15000): Promise<Fix> {
  return new Promise((res, rej) => {
    if (!("geolocation" in navigator)) return rej(new Error("Bu cihazda konum yok"));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, src: 1 }),
      (e) => rej(new Error(e.code === 1 ? "Konum izni verilmedi" : "GPS sinyali alınamadı")),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

/** Güneşin pusula açısı (kuzeyden saat yönünde, derece) ve ufuktan yüksekliği. */
export function sunPosition(lat: number, lon: number, when = new Date()) {
  const p = SunCalc.getPosition(when, lat, lon);
  const azimuth = ((p.azimuth * 180) / Math.PI + 180 + 360) % 360; // suncalc: güneyden batıya
  const altitude = (p.altitude * 180) / Math.PI;
  return { azimuth, altitude };
}

const DIRS = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
export const dirName = (deg: number) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/** Cihaz yönünü (pusula başlığı) okur. iOS'ta webkitCompassHeading, Android'de mutlak alpha. */
export function watchHeading(cb: (deg: number) => void): () => void {
  const handler = (e: DeviceOrientationEvent) => {
    const w = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof w === "number") return cb(w);
    if (e.alpha !== null && (e.absolute || e.type === "deviceorientationabsolute")) cb((360 - e.alpha) % 360);
  };
  const evt = "ondeviceorientationabsolute" in self ? "deviceorientationabsolute" : "deviceorientation";
  self.addEventListener(evt, handler as EventListener);
  return () => self.removeEventListener(evt, handler as EventListener);
}

export async function askOrientationPermission(): Promise<boolean> {
  const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof D.requestPermission === "function") return (await D.requestPermission()) === "granted";
  return true;
}
