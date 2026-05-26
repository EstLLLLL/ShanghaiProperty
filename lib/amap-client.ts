import AMapLoader from "@amap/amap-jsapi-loader";

let loadPromise: Promise<typeof AMap> | null = null;

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode?: string };
  }
}

export function loadAMap(): Promise<typeof AMap> {
  if (loadPromise) return loadPromise;

  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  const security = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;
  if (!key) {
    return Promise.reject(new Error("NEXT_PUBLIC_AMAP_KEY is not set"));
  }

  if (typeof window !== "undefined" && security) {
    window._AMapSecurityConfig = { securityJsCode: security };
  }

  loadPromise = AMapLoader.load({
    key,
    version: "2.0",
    plugins: ["AMap.MarkerCluster", "AMap.Geocoder", "AMap.PlaceSearch"],
  });

  return loadPromise;
}
