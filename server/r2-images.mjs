import { createHash, createHmac, randomUUID } from 'node:crypto'
import { MenuStoreError } from './menu-store.mjs'

export const MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024

function hmac(key, value, encoding) {
  return createHmac('sha256', key).update(value).digest(encoding)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function encodePath(value) {
  return value.split('/').map((part) => encodeURIComponent(part)).join('/')
}

export function normalizePublicImageBase(value) {
  if (!value) return ''
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) return ''
    return parsed.href.replace(/\/+$/, '')
  } catch {
    return ''
  }
}

export function inspectMenuImage(buffer, contentType) {
  if (!Buffer.isBuffer(buffer)) throw new MenuStoreError('The uploaded image data is invalid.', 400, 'invalid_image')
  if (buffer.length > MAX_MENU_IMAGE_BYTES) throw new MenuStoreError('Choose an image smaller than 5 MB.', 413, 'payload_too_large')
  if (buffer.length < 24) throw new MenuStoreError('The uploaded image data is incomplete.', 400, 'invalid_image')

  if (contentType === 'image/png') {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    if (!buffer.subarray(0, 8).equals(signature) || buffer.readUInt32BE(8) !== 13 || buffer.toString('ascii', 12, 16) !== 'IHDR') {
      throw new MenuStoreError('The file is not a valid PNG image.', 415, 'invalid_image')
    }
    if (buffer.length < 45 || buffer.toString('ascii', buffer.length - 8, buffer.length - 4) !== 'IEND') {
      throw new MenuStoreError('The PNG image is incomplete.', 415, 'invalid_image')
    }
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)
    if (!width || !height) throw new MenuStoreError('The image dimensions are invalid.', 415, 'invalid_image')
    if (width > 10000 || height > 10000 || width * height > 40_000_000) throw new MenuStoreError('Images must be no larger than 10,000 pixels per side or 40 megapixels.', 413, 'image_dimensions_too_large')
    return { width, height, extension: 'png' }
  }

  if (contentType === 'image/jpeg') {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[buffer.length - 2] !== 0xff || buffer[buffer.length - 1] !== 0xd9) {
      throw new MenuStoreError('The file is not a complete JPEG image.', 415, 'invalid_image')
    }
    let offset = 2
    while (offset + 4 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue }
      const marker = buffer[offset + 1]
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { offset += 2; continue }
      const segmentLength = buffer.readUInt16BE(offset + 2)
      if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) break
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        const height = buffer.readUInt16BE(offset + 5)
        const width = buffer.readUInt16BE(offset + 7)
        if (!width || !height) break
        if (width > 10000 || height > 10000 || width * height > 40_000_000) throw new MenuStoreError('Images must be no larger than 10,000 pixels per side or 40 megapixels.', 413, 'image_dimensions_too_large')
        return { width, height, extension: 'jpg' }
      }
      offset += 2 + segmentLength
    }
    throw new MenuStoreError('The JPEG image dimensions could not be read.', 415, 'invalid_image')
  }

  throw new MenuStoreError('Use a JPEG or PNG image.', 415, 'unsupported_media_type')
}

function makeSignedHeaders({ method, url, contentType, body, env, now }) {
  const host = url.host
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const day = date.slice(0, 8)
  const bodyHash = sha256(body)
  const headers = {
    host,
    'x-amz-content-sha256': bodyHash,
    'x-amz-date': date,
    ...(contentType ? { 'content-type': contentType } : {}),
  }
  const signedHeaders = Object.keys(headers).sort().join(';')
  const canonicalHeaders = Object.keys(headers).sort().map((key) => `${key}:${headers[key].trim()}\n`).join('')
  const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaders, bodyHash].join('\n')
  const scope = `${day}/auto/s3/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${date}\n${scope}\n${sha256(canonicalRequest)}`
  const dateKey = hmac(`AWS4${env.R2_SECRET_ACCESS_KEY}`, day)
  const regionKey = hmac(dateKey, 'auto')
  const serviceKey = hmac(regionKey, 's3')
  const signingKey = hmac(serviceKey, 'aws4_request')
  const signature = hmac(signingKey, stringToSign, 'hex')
  headers.Authorization = `AWS4-HMAC-SHA256 Credential=${env.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  return headers
}

export function createR2ImageStore(env = process.env, fetchImpl = fetch) {
  const publicBase = normalizePublicImageBase(env.R2_PUBLIC_URL)
  const configured = Boolean(
    env.R2_ACCOUNT_ID && /^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID) &&
    env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY &&
    /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/i.test(env.R2_BUCKET || '') && publicBase,
  )
  const endpoint = configured ? new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`) : null

  function objectUrl(key) {
    if (!endpoint) throw new MenuStoreError('Photo storage is not configured. Set the R2 account, bucket, access key, secret, and public image URL on the server.', 503, 'image_storage_unconfigured')
    const url = new URL(endpoint.href)
    url.pathname = `/${encodePath(env.R2_BUCKET)}/${encodePath(key)}`
    return url
  }

  async function request(method, url, body, contentType) {
    const headers = makeSignedHeaders({ method, url, contentType, body, env, now: new Date() })
    const response = await fetchImpl(url, { method, headers, ...(method === 'PUT' ? { body } : {}) })
    if (!response.ok) throw new MenuStoreError('The photo could not be saved to persistent storage. Check the R2 bucket permissions and try again.', 502, 'image_storage_failed')
  }

  return {
    publicBase,
    configured,
    async put(buffer, contentType, extension) {
      const key = `menu/${randomUUID()}.${extension}`
      await request('PUT', objectUrl(key), buffer, contentType)
      return { src: `${publicBase}/${key}`, key }
    },
    keyForPublicUrl(src) {
      if (!publicBase || typeof src !== 'string' || !src.startsWith(`${publicBase}/menu/`)) return null
      const key = src.slice(publicBase.length + 1)
      return /^menu\/[0-9a-f-]{36}\.(?:jpg|png)$/.test(key) ? key : null
    },
    async deletePublicUrl(src) {
      const key = this.keyForPublicUrl(src)
      if (!key) return false
      await request('DELETE', objectUrl(key), Buffer.alloc(0))
      return true
    },
  }
}
