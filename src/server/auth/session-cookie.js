import authCookie from '@hapi/cookie'
import { config } from '../../config/config.js'
import { saveUserSession } from './save-user-session.js'

const sessionCookieConfig = config.get('session.cookie')

export const sessionCookie = {
  plugin: {
    name: 'user-session',
    register: async (server) => {
      await server.register(authCookie)

      server.auth.strategy('session', 'cookie', {
        cookie: {
          name: 'userSessionCookie',
          path: '/',
          password: sessionCookieConfig.password,
          isSecure: sessionCookieConfig.isSecure,
          ttl: sessionCookieConfig.ttl,
          clearInvalid: true
        },
        keepAlive: true,
        requestDecoratorName: 'sessionCookie',
        validate: async (request, session) => {
          const sessionId = session.sessionId
          if (!session?.sessionId) {
            return { isValid: false }
          }
          // const currentUserSession = await getSession(sessionId, server)
          const currentUserSession = await server.session.get(sessionId)
          if (!currentUserSession?.isAuthenticated) {
            return { isValid: false }
          }

          let refreshedSession
          try {
            const { token, refreshed } = await request.ensureValidToken(currentUserSession)
            if (refreshed) {
              request.logger.info(`Refreshing session: ${sessionId}`)
              refreshedSession = await saveUserSession(request, sessionId, token)
            }
          } catch (error) {
            request.logger.warn(error, `Ensure valid token for ${currentUserSession?.displayName} failed`)
            // dropSession(sessionId, server)
          }

          const userSession = refreshedSession || currentUserSession

          // const { scopes, scopeFlags } = await fetchScopes(userSession.token)
          return {
            isValid: true,
            credentials: {
              ...userSession,
              // ...(scopeFlags ?? {}),
              // scope: scopes ?? []
              scope: []
            }
          }
        }
      })
      server.auth.default('session')
    }
  }
}
