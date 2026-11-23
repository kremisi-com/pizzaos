import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import sharp from "sharp";

export interface MenuImage {
  type: string;
  bytes: Buffer;
}
export interface MenuImages {
  save(storeId: string, media: MenuImage): Promise<string>;
  get(storeId: string, imageId: string): Promise<MenuImage | null>;
  owns?(storeId: string, imageId: string): Promise<boolean>;
}
export const MENU_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MENU_IMAGE_BODY_LIMIT = 2 * 1024 * 1024;

export async function validMenuImage(image: MenuImage): Promise<boolean> {
  if (!MENU_IMAGE_TYPES.includes(image.type) || !image.bytes.length || image.bytes.length > MENU_IMAGE_BODY_LIMIT) return false;
  try {
    const decoder = sharp(image.bytes, { limitInputPixels: 16_000_000, failOn: "error" });
    const info = await decoder.metadata();
    if (!info.width || !info.height || image.type !== `image/${info.format}` || (info.pages ?? 1) !== 1) return false;
    await decoder.stats();
    return true;
  } catch { return false; }
}

export function createPostgresMenuImages(pool: Pool): MenuImages {
  return {
    async save(storeId, { type, bytes }) {
      const id = randomUUID();
      await pool.query("INSERT INTO ordering_menu_images (store_id, id, type, bytes) VALUES ($1, $2, $3, $4)", [storeId, id, type, bytes]);
      return id;
    },
    async get(storeId, id) {
      const result = await pool.query<MenuImage>("SELECT type, bytes FROM ordering_menu_images WHERE store_id = $1 AND id = $2", [storeId, id]);
      return result.rows[0] ?? null;
    },
    async owns(storeId, id) {
      const result = await pool.query("SELECT 1 FROM ordering_menu_images WHERE store_id = $1 AND id = $2", [storeId, id]);
      return Boolean(result.rowCount);
    }
  };
}
