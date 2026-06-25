import { removeAuthenticatedUser } from './remove-authenticated-user.js'

describe('#removeAuthenticatedUser', () => {
  test('Should remove the authenticated user', () => {
    const request = {
      server: {
        session: {
          drop: vi.fn()
        }
      },
      sessionCookie: {
        clear: vi.fn(),
        h: {
          response: vi.fn().mockReturnThis(),
          unstate: vi.fn().mockReturnThis()
        }
      },
      state: {
        userSessionCookie: {
          sessionId: 'sessionId'
        }
      }
    }

    removeAuthenticatedUser(request)

    expect(request.server.session.drop).toHaveBeenCalled()
    expect(request.sessionCookie.clear).toHaveBeenCalled()
  })

  test('Should remove the authenticated user when state missing', () => {
    const request = {
      server: {
        session: {
          drop: vi.fn()
        }
      },
      sessionCookie: {
        clear: vi.fn()
      },
      state: {
        userSessionCookie: {
          sessionId: 'sessionId'
        }
      }
    }

    removeAuthenticatedUser(request)

    expect(request.server.session.drop).toHaveBeenCalled()
    expect(request.sessionCookie.clear).not.toHaveBeenCalled()
  })
})
