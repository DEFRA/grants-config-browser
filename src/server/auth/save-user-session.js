import { addSeconds } from 'date-fns'

export async function saveUserSession(request, sessionId, { accessToken, refreshToken, expiresIn, claims }) {
  const expiresInSeconds = expiresIn
  const expiresInMilliSeconds = expiresInSeconds * 1000
  const expiresAt = addSeconds(new Date(), expiresInSeconds).toISOString()

  const session = {
    id: claims.oid,
    displayName: claims.name,
    email: claims.email ?? claims.preferred_username,
    loginHint: claims.login_hint,
    isAuthenticated: true,
    accessToken,
    refreshToken,
    expiresIn: expiresInMilliSeconds,
    expiresAt
  }

  request.server.session.set(sessionId, session)
  return session
}
