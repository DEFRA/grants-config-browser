export function removeAuthenticatedUser(request) {
  request.server.session.drop(request.state?.userSessionCookie?.sessionId)
  if (request.sessionCookie?.h) {
    request.sessionCookie.clear()
    request.sessionCookie.h.unstate('csrfToken')
    request.sessionCookie.h.unstate('userSessionCookie')
  }
}
