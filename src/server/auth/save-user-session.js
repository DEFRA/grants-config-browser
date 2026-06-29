import { addSeconds } from 'date-fns'

const DEFAULT_EXPIRES_IN = 3600
const AS_MILLIS = 1000
export async function saveUserSession(request, sessionId, credentials) {
  const { accessToken, refreshToken, expiresIn, claims } = credentials || {}

  if (!claims) {
    request.logger.error({ credentials }, 'saveUserSession: No claims found in credentials')
  }

  const expiresInSeconds = expiresIn || DEFAULT_EXPIRES_IN
  const expiresInMilliSeconds = expiresInSeconds * AS_MILLIS
  const expiresAt = addSeconds(new Date(), expiresInSeconds).toISOString()

  request.logger.info(`saveUserSession: Saving user session ${JSON.stringify(claims)}`)

  const session = {
    id: claims?.oid,
    displayName: claims?.name,
    email: claims?.email ?? claims?.preferred_username,
    loginHint: claims?.login_hint,
    isAuthenticated: true,
    accessToken,
    refreshToken,
    expiresIn: expiresInMilliSeconds,
    expiresAt,
    token: credentials // Store full credentials for request.ensureValidToken
  }

  request.server.session.set(sessionId, session)
  return session
}
