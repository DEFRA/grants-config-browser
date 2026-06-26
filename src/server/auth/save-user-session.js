import { addSeconds } from 'date-fns'

export async function saveUserSession(request, sessionId, credentials) {
  const { accessToken, refreshToken, expiresIn, claims } = credentials || {}

  if (!claims) {
    request.logger.error({ credentials }, 'saveUserSession: No claims found in credentials')
  }

  const expiresInSeconds = expiresIn || 3600
  const expiresInMilliSeconds = expiresInSeconds * 1000
  const expiresAt = addSeconds(new Date(), expiresInSeconds).toISOString()

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
