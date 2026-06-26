import { sessionCookie } from './session-cookie.js'
import { saveUserSession } from './save-user-session.js'
import Hapi from '@hapi/hapi'

vi.mock('../../config/config.js', () => ({
  config: {
    get: vi.fn().mockReturnValue({
      password: 'password-must-be-at-least-32-characters-long',
      isSecure: false,
      ttl: 3600000
    })
  }
}))

vi.mock('./save-user-session.js', () => ({
  saveUserSession: vi.fn()
}))

describe('session-cookie', () => {
  let server

  beforeEach(async () => {
    server = Hapi.server()
    server.decorate('server', 'session', {
      get: vi.fn()
    })
    await server.register(sessionCookie.plugin)
    server.route({
      method: 'GET',
      path: '/test-auth',
      options: {
        auth: 'session'
      },
      handler: (request) => request.auth.credentials
    })
    // Mock the session cookie state since we can't easily set encrypted cookies in inject
    server.ext('onPreAuth', (request, h) => {
      if (request.headers.cookie?.includes('userSessionCookie')) {
        request.state.userSessionCookie = { sessionId: '123' }
      }
      request.logger = { warn: vi.fn(), info: vi.fn() }

      const refreshed = !!request.headers['x-test-refresh']
      const fail = !!request.headers['x-test-fail']

      request.ensureValidToken = vi.fn().mockImplementation(async () => {
        if (fail) throw new Error('refresh failed')
        return { token: 'new-token', refreshed }
      })
      return h.continue
    })
    await server.initialize()
  })

  test('should register the session strategy', () => {
    expect(server.auth.settings.default.strategies).toContain('session')
  })

  describe('validate', () => {
    test('should return isValid: false if sessionId is missing', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/test-auth'
      })
      expect(response.statusCode).toBe(401)
    })

    test('should return isValid: false if session is not found or not authenticated', async () => {
      server.session.get.mockResolvedValue(null)
      const response = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: 'userSessionCookie=...'
        }
      })
      expect(response.statusCode).toBe(401)

      server.session.get.mockResolvedValue({ isAuthenticated: false })
      const response2 = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: 'userSessionCookie=...'
        }
      })
      expect(response2.statusCode).toBe(401)
    })

    test('should return isValid: true and credentials if session is valid', async () => {
      const session = { sessionId: '123', isAuthenticated: true, user: 'test' }
      server.session.get.mockResolvedValue(session)

      const { result } = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: 'userSessionCookie=...'
        }
      })

      expect(result).toEqual({
        ...session,
        scope: []
      })
    })

    test('should refresh token if ensureValidToken returns refreshed: true', async () => {
      const session = { sessionId: '123', isAuthenticated: true, user: 'test' }
      const refreshedSession = { ...session, token: 'new-token' }
      server.session.get.mockResolvedValue(session)
      saveUserSession.mockResolvedValue(refreshedSession)

      const { result } = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: 'userSessionCookie=...',
          'x-test-refresh': 'true'
        }
      })

      expect(saveUserSession).toHaveBeenCalled()
      expect(result).toEqual({
        ...refreshedSession,
        scope: []
      })
    })

    test('should log warning and continue with current session if ensureValidToken fails', async () => {
      const session = { sessionId: '123', isAuthenticated: true, displayName: 'Test User' }
      server.session.get.mockResolvedValue(session)

      const { result } = await server.inject({
        method: 'GET',
        url: '/test-auth',
        headers: {
          cookie: 'userSessionCookie=...',
          'x-test-fail': 'true'
        }
      })

      expect(result.sessionId).toBe('123')
    })
  })
})
