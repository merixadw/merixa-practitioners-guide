/**
 * Lossless compression for Library + Premium inventory payloads.
 * Prefers native CompressionStream (deflate); falls back to raw UTF-8
 * so older WebViews never break.
 */

export type PayloadEncoding = "deflate" | "raw";

export type CompressedPayload = {
  bytes: Uint8Array;
  encoding: PayloadEncoding;
  /** Uncompressed UTF-8 byte length (for budgeting / metrics). */
  rawBytes: number;
};

function hasCompressionStream(): boolean {
  return (
    typeof CompressionStream === "function" &&
    typeof DecompressionStream === "function"
  );
}

async function streamTransform(
  bytes: Uint8Array,
  stream: ReadableWritablePair<Uint8Array, Uint8Array>,
): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer]);
  const compressed = blob.stream().pipeThrough(stream);
  const buffer = await new Response(compressed).arrayBuffer();
  return new Uint8Array(buffer);
}

/** Compress a UTF-8 JSON string for IndexedDB storage. */
export async function compressText(text: string): Promise<CompressedPayload> {
  const encoder = new TextEncoder();
  const raw = encoder.encode(text);
  if (!hasCompressionStream() || raw.byteLength < 512) {
    return { bytes: raw, encoding: "raw", rawBytes: raw.byteLength };
  }
  try {
    const bytes = await streamTransform(
      raw,
      new CompressionStream("deflate") as unknown as ReadableWritablePair<
        Uint8Array,
        Uint8Array
      >,
    );
    if (bytes.byteLength >= raw.byteLength * 0.95) {
      return { bytes: raw, encoding: "raw", rawBytes: raw.byteLength };
    }
    return { bytes, encoding: "deflate", rawBytes: raw.byteLength };
  } catch {
    return { bytes: raw, encoding: "raw", rawBytes: raw.byteLength };
  }
}

/** Inflate a stored payload back to a UTF-8 string. */
export async function decompressText(
  bytes: Uint8Array,
  encoding: PayloadEncoding,
): Promise<string> {
  const decoder = new TextDecoder();
  if (encoding === "raw") {
    return decoder.decode(bytes);
  }
  if (!hasCompressionStream()) {
    throw new Error("deflate payload requires CompressionStream");
  }
  const inflated = await streamTransform(
    bytes,
    new DecompressionStream("deflate") as unknown as ReadableWritablePair<
      Uint8Array,
      Uint8Array
    >,
  );
  return decoder.decode(inflated);
}

export function estimateCompressionRatio(payload: CompressedPayload): number {
  if (payload.rawBytes <= 0) return 1;
  return payload.bytes.byteLength / payload.rawBytes;
}
