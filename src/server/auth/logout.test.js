import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { removeAuthenticatedUser } from './remove-authenticated-user.js'

vi.mock('./remove-authenticated-user.js')

describe('#signOutController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should redirect to home if no user session', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/logout'
    })

    expect(statusCode).toBe(statusCodes.moved)
    expect(headers.location).toBe('/')
  })

  test('Should redirect to logout URL if user session exists', async () => {
    const endSessionEndpoint = 'https://example.com/logout'

    // Mock fetch for OIDC discovery
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        end_session_endpoint: endSessionEndpoint
      })
    })

    const credentials = {
      loginHint: 'test-user'
    }

    const referrer = 'https://referrer.com'

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/logout',
      auth: {
        strategy: 'session', // Assuming session strategy is used
        credentials
      },
      headers: {
        referer: referrer
      }
    })

    const expectedLogoutUrl = encodeURI(
      `${endSessionEndpoint}?logout_hint=${credentials.loginHint}&post_logout_redirect_uri=${referrer}`
    )

    expect(statusCode).toBe(statusCodes.moved)
    expect(headers.location).toBe(expectedLogoutUrl)
    expect(removeAuthenticatedUser).toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET'
      })
    )
  })
})
