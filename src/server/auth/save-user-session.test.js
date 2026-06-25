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
      expiresAt: expectedExpiresAt
    }

    const result = await saveUserSession(request, sessionId, sessionData)

    expect(request.server.session.set).toHaveBeenCalledWith(sessionId, expectedSession)
    expect(result).toEqual(expectedSession)
  })

  test('should use preferred_username if email is not present in claims', async () => {
    const request = {
      server: {
        session: {
          set: vi.fn()
        }
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
