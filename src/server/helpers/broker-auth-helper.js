import { config } from '../../config/config.js'
import { generateToken } from '../common/helpers/sts/grants-config-broker-token.js'

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

  if (!config.get('backend.serviceAuth.enabled')) {
    return baseHeaders
  }
  return createAuthenticatedHeaders(request, baseHeaders)
}
