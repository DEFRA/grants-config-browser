import { config } from '../../config/config.js'
import { generateToken } from '../common/helpers/sts/grants-config-broker-token.js'
import crypto from 'node:crypto'

const CONTENT_TYPE_JSON = 'application/json'
const AUTH_SCHEME = 'Bearer'

/**
 * Creates headers for authenticating with the config-broker API
 * @param {object} request - Hapi request object
 * @param {object} baseHeaders - Base headers to extend
 * @returns {Promise<object>} Headers with authentication if token is available
 */
export async function createAuthenticatedHeaders(request, baseHeaders = {}) {
  const headers = { ...baseHeaders }

  const token = await generateToken(request.sts)
  headers.Authorization = `${AUTH_SCHEME} ${token}`
  return headers
}

/**
 * Creates standard headers for API requests to grants-ui-backend
 * @param {object} request - Hapi request object
 * @returns {Promise<object>} Headers with Content-Type and authentication
 */
export async function createApiHeadersForConfigBroker(request) {
  const baseHeaders = { 'Content-Type': CONTENT_TYPE_JSON }

  if (config.get('backend.legacyAuth.enabled')) {
    return createLegacyAuthenticatedHeaders(GRANTS_CONFIG_BROKER_AUTH_TOKEN, ENCRYPTION_KEY, baseHeaders)
  }
  if (!config.get('backend.serviceAuth.enabled')) {
    return baseHeaders
  }
  return createAuthenticatedHeaders(request, baseHeaders)
}

// Legacy bearer auth scheme
const IV_LENGTH_BYTES = 12
const KEY_LENGTH_BYTES = 32
const SCRYPT_SALT = 'salt'
const CIPHER_ALGORITHM = 'aes-256-gcm'
/** @type {Record<string, BufferEncoding>} */
const ENCODING = {
  UTF8: 'utf8',
  BASE64: 'base64'
}
const GRANTS_CONFIG_BROKER_AUTH_TOKEN = config.get('backend.legacyAuth.token')
const ENCRYPTION_KEY = config.get('backend.legacyAuth.encryptionKey')

const createLegacyAuthenticatedHeaders = (token, encryptionKey, baseHeaders) => {
  const headers = { ...baseHeaders }

  if (token) {
    const encryptedToken = encryptToken(token, encryptionKey)
    const authCredentials = Buffer.from(encryptedToken).toString(ENCODING.BASE64)
    headers.Authorization = `${AUTH_SCHEME} ${authCredentials}`
  }

  return headers
}

function encryptToken(token, encryptionKey) {
  const iv = crypto.randomBytes(IV_LENGTH_BYTES)
  const key = crypto.scryptSync(encryptionKey, SCRYPT_SALT, KEY_LENGTH_BYTES)
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv)

  let encrypted = cipher.update(token, ENCODING.UTF8, ENCODING.BASE64)
  encrypted += cipher.final(ENCODING.BASE64)

  const authTag = cipher.getAuthTag()

  return `${iv.toString(ENCODING.BASE64)}:${authTag.toString(ENCODING.BASE64)}:${encrypted}`
}
