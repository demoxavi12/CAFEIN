import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

export function listNumberedGalleryWebp(fileNames) {
  return fileNames
    .filter((filename) => /^\d+\.webp$/i.test(filename) && Number.parseInt(filename, 10) > 0)
    .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10))
}

export function discoverNumberedGalleryWebp(directory) {
  let filenames
  try {
    filenames = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  return listNumberedGalleryWebp(filenames)
}

export function readWebpDimensions(filePath) {
  const data = readFileSync(filePath)
  if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`Gallery asset is not a valid WebP file: ${path.basename(filePath)}`)
  }

  let offset = 12
  while (offset + 8 <= data.length) {
    const chunkType = data.toString('ascii', offset, offset + 4)
    const chunkSize = data.readUInt32LE(offset + 4)
    const payload = offset + 8

    if (chunkType === 'VP8X' && chunkSize >= 10) {
      return {
        width: 1 + data.readUIntLE(payload + 4, 3),
        height: 1 + data.readUIntLE(payload + 7, 3),
      }
    }

    if (chunkType === 'VP8L' && chunkSize >= 5) {
      const b1 = data[payload + 1]
      const b2 = data[payload + 2]
      const b3 = data[payload + 3]
      const b4 = data[payload + 4]
      return {
        width: 1 + (((b2 & 0x3f) << 8) | b1),
        height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
      }
    }

    if (chunkType === 'VP8 ' && chunkSize >= 10) {
      return {
        width: data.readUInt16LE(payload + 6) & 0x3fff,
        height: data.readUInt16LE(payload + 8) & 0x3fff,
      }
    }

    offset = payload + chunkSize + (chunkSize % 2)
  }

  throw new Error(`Could not read WebP dimensions: ${path.basename(filePath)}`)
}
