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
const LOGO_LIGHT_PATH = resolve(process.cwd(), "public/images/logo-light.png");
const FAVICON_ASSETS = [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
] as const;

interface PngPixelAnalysis {
  readonly width: number;
  readonly height: number;
  readonly transparentPixels: number;
  readonly darkOpaquePixels: number;
  readonly redOpaquePixels: number;
  readonly whiteOpaquePixels: number;
}

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

function analyzePngPixels(
  rawImage: Buffer,
  width: number,
  height: number,
): PngPixelAnalysis {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  let inputOffset = 0;
  let previousRow = Buffer.alloc(stride);
  let transparentPixels = 0;
  let darkOpaquePixels = 0;
  let redOpaquePixels = 0;
  let whiteOpaquePixels = 0;

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

    for (let index = 0; index < stride; index += bytesPerPixel) {
      const red = row[index];
      const green = row[index + 1];
      const blue = row[index + 2];
      const alpha = row[index + 3];

      if (alpha === 0) {
        transparentPixels += 1;
      }

      if (alpha > 128 && red < 80 && green < 80 && blue < 80) {
        darkOpaquePixels += 1;
      }

      if (alpha > 128 && red > 180 && green < 90 && blue < 80) {
        redOpaquePixels += 1;
      }

      if (alpha > 128 && red > 240 && green > 240 && blue > 240) {
        whiteOpaquePixels += 1;
      }
    }

    previousRow = row;
  }

  return {
    width,
    height,
    transparentPixels,
    darkOpaquePixels,
    redOpaquePixels,
    whiteOpaquePixels,
  };
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
    const analysis = analyzePngPixels(
      inflateSync(imageData),
      width,
      height,
    );

    expect(analysis.transparentPixels).toBeGreaterThan(0);
  });

  it("keeps a light footer logo with white lettering and matching red brand color", () => {
    const defaultLogo = readFileSync(LOGO_PATH);
    const lightLogo = readFileSync(LOGO_LIGHT_PATH);
    const defaultChunks = readPngChunks(defaultLogo);
    const lightChunks = readPngChunks(lightLogo);
    const defaultHeader = defaultChunks.find((chunk) => chunk.type === "IHDR");
    const lightHeader = lightChunks.find((chunk) => chunk.type === "IHDR");
    const defaultImageData = Buffer.concat(
      defaultChunks
        .filter((chunk) => chunk.type === "IDAT")
        .map((chunk) => chunk.data),
    );
    const lightImageData = Buffer.concat(
      lightChunks
        .filter((chunk) => chunk.type === "IDAT")
        .map((chunk) => chunk.data),
    );

    expect(lightLogo.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);
    expect(lightHeader?.data[8]).toBe(8);
    expect(lightHeader?.data[9]).toBe(6);

    const defaultAnalysis = analyzePngPixels(
      inflateSync(defaultImageData),
      defaultHeader?.data.readUInt32BE(0) ?? 0,
      defaultHeader?.data.readUInt32BE(4) ?? 0,
    );
    const lightAnalysis = analyzePngPixels(
      inflateSync(lightImageData),
      lightHeader?.data.readUInt32BE(0) ?? 0,
      lightHeader?.data.readUInt32BE(4) ?? 0,
    );

    expect(lightAnalysis.width).toBe(defaultAnalysis.width);
    expect(lightAnalysis.height).toBe(defaultAnalysis.height);
    expect(lightAnalysis.transparentPixels).toBe(
      defaultAnalysis.transparentPixels,
    );
    expect(lightAnalysis.redOpaquePixels).toBe(defaultAnalysis.redOpaquePixels);
    expect(lightAnalysis.darkOpaquePixels).toBe(0);
    expect(lightAnalysis.whiteOpaquePixels).toBeGreaterThan(80_000);
  });

  it("uses a cropped logo mark for favicon and app icon assets", () => {
    for (const [fileName, expectedSize] of FAVICON_ASSETS) {
      const buffer = readFileSync(
        resolve(process.cwd(), "public/favicon", fileName),
      );
      const chunks = readPngChunks(buffer);
      const header = chunks.find((chunk) => chunk.type === "IHDR");
      const imageData = Buffer.concat(
        chunks
          .filter((chunk) => chunk.type === "IDAT")
          .map((chunk) => chunk.data),
      );

      expect(buffer.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);
      expect(header?.data[8]).toBe(8);
      expect(header?.data[9]).toBe(6);

      const analysis = analyzePngPixels(
        inflateSync(imageData),
        header?.data.readUInt32BE(0) ?? 0,
        header?.data.readUInt32BE(4) ?? 0,
      );
      const totalPixels = expectedSize * expectedSize;

      expect(analysis.width).toBe(expectedSize);
      expect(analysis.height).toBe(expectedSize);
      expect(analysis.transparentPixels).toBeGreaterThan(totalPixels * 0.4);
      expect(analysis.redOpaquePixels).toBeGreaterThan(totalPixels * 0.35);
      expect(analysis.darkOpaquePixels).toBe(0);
    }
  });
});
