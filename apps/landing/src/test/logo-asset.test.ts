import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

interface PngChunk {
  readonly type: string;
  readonly data: Buffer;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const LOGO_PATH = resolve(process.cwd(), "public/images/logo.png");

function readPngChunks(buffer: Buffer): PngChunk[] {
  const chunks: PngChunk[] = [];
  let offset = PNG_SIGNATURE.length;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    chunks.push({ type, data });
    offset += length + 12;

    if (type === "IEND") {
      break;
    }
  }

  return chunks;
}

function paethPredictor(left: number, up: number, upLeft: number): number {
  const prediction = left + up - upLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upLeftDistance = Math.abs(prediction - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}

function countTransparentPixels(
  rawImage: Buffer,
  width: number,
  height: number,
): number {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  let inputOffset = 0;
  let previousRow = Buffer.alloc(stride);
  let transparentPixels = 0;

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filter = rawImage[inputOffset];
    const row = Buffer.alloc(stride);
    inputOffset += 1;

    for (let index = 0; index < stride; index += 1) {
      const value = rawImage[inputOffset];
      const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
      const up = previousRow[index] ?? 0;
      const upLeft =
        index >= bytesPerPixel ? (previousRow[index - bytesPerPixel] ?? 0) : 0;

      if (filter === 0) {
        row[index] = value;
      } else if (filter === 1) {
        row[index] = (value + left) & 255;
      } else if (filter === 2) {
        row[index] = (value + up) & 255;
      } else if (filter === 3) {
        row[index] = (value + Math.floor((left + up) / 2)) & 255;
      } else if (filter === 4) {
        row[index] = (value + paethPredictor(left, up, upLeft)) & 255;
      } else {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }

      inputOffset += 1;
    }

    for (let index = 3; index < stride; index += bytesPerPixel) {
      if (row[index] === 0) {
        transparentPixels += 1;
      }
    }

    previousRow = row;
  }

  return transparentPixels;
}

describe("landing logo asset", () => {
  it("uses alpha transparency instead of a solid background", () => {
    const buffer = readFileSync(LOGO_PATH);

    expect(buffer.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);

    const chunks = readPngChunks(buffer);
    const header = chunks.find((chunk) => chunk.type === "IHDR");
    const imageData = Buffer.concat(
      chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data),
    );

    expect(header).toBeDefined();
    expect(header?.data[8]).toBe(8);
    expect(header?.data[9]).toBe(6);

    const width = header?.data.readUInt32BE(0) ?? 0;
    const height = header?.data.readUInt32BE(4) ?? 0;
    const transparentPixels = countTransparentPixels(
      inflateSync(imageData),
      width,
      height,
    );

    expect(transparentPixels).toBeGreaterThan(0);
  });
});
