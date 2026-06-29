import { saveUserSession } from './save-user-session.js'
import { addSeconds } from 'date-fns'

describe('saveUserSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should correctly format and save the session', async () => {
    const now = new Date('2026-06-25T07:45:00Z')
    vi.setSystemTime(now)

    const request = {
      server: {
        session: {
          set: vi.fn()
        }
      },
      logger: {
        info: vi.fn()
      }
    }
    const sessionId = 'test-session-id'
    const sessionData = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      claims: {
        oid: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        login_hint: 'login-hint'
      }
    }

    const expectedExpiresAt = addSeconds(now, 3600).toISOString()
    const expectedSession = {
      id: 'user-id',
      displayName: 'Test User',
      email: 'test@example.com',
      loginHint: 'login-hint',
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600000,
      expiresAt: expectedExpiresAt,
      token: sessionData
    }

    const result = await saveUserSession(request, sessionId, sessionData)

    expect(request.server.session.set).toHaveBeenCalledWith(sessionId, expectedSession)
    expect(result).toEqual(expectedSession)
  })

  test('should correctly format and save the session when mising some credentials', async () => {
    const now = new Date('2026-06-25T07:45:00Z')
    vi.setSystemTime(now)

    const request = {
      server: {
        session: {
          set: vi.fn()
        }
      },
      logger: {
        error: vi.fn(),
        info: vi.fn()
      }
    }
    const sessionId = 'test-session-id'
    const sessionData = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    }

    const expectedExpiresAt = addSeconds(now, 3600).toISOString()
    const expectedSession = {
      id: undefined,
      displayName: undefined,
      email: undefined,
      loginHint: undefined,
      isAuthenticated: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600000,
      expiresAt: expectedExpiresAt,
      token: sessionData
    }

    const result = await saveUserSession(request, sessionId, sessionData)

    expect(request.server.session.set).toHaveBeenCalledWith(sessionId, expectedSession)
    expect(result).toEqual(expectedSession)
    expect(request.logger.error).toHaveBeenCalledWith(
      { credentials: sessionData },
      'saveUserSession: No claims found in credentials'
    )
  })

  test('should use preferred_username if email is not present in claims', async () => {
    const request = {
      server: {
        session: {
          set: vi.fn()
        }
      },
      logger: {
        info: vi.fn()
      }
    }
    const sessionId = 'test-session-id'
    const sessionData = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      claims: {
        oid: 'user-id',
        name: 'Test User',
        preferred_username: 'preferred@example.com',
        login_hint: 'login-hint'
      }
    }

    const result = await saveUserSession(request, sessionId, sessionData)

    expect(result.email).toBe('preferred@example.com')
    expect(request.server.session.set).toHaveBeenCalled()
  })
})
