// Minimal AMap typings to keep TS happy. Treat as `any`-ish for now.
declare namespace AMap {
  type LngLat = unknown;
  type Bounds = {
    getSouthWest(): { getLng(): number; getLat(): number };
    getNorthEast(): { getLng(): number; getLat(): number };
  };
  class Map {
    constructor(container: HTMLElement, options?: Record<string, unknown>);
    on(event: string, cb: () => void): void;
    getBounds(): Bounds;
    destroy(): void;
    setCenter(lnglat: [number, number]): void;
    setZoom(zoom: number): void;
  }
  class Marker {
    setContent(content: string | HTMLElement): void;
    setOffset(offset: unknown): void;
    on(event: string, cb: () => void): void;
  }
  class MarkerCluster {
    constructor(map: Map, data: unknown[], options?: Record<string, unknown>);
    setMap(map: Map | null): void;
  }
  class Pixel {
    constructor(x: number, y: number);
  }
}
