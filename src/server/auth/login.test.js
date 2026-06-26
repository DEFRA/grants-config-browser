import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

describe('#signInController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should call request.login', async () => {
    // We need to verify that request.login is called.
    // Since request.login is added by the OIDC plugin, we can't easily mock it before it's added.
    // However, we can use a server extension to mock it on every request.
    let loginCalled = false
    server.ext('onPreHandler', (request, h) => {
      if (request.path === '/login') {
        request.login = () => {
          loginCalled = true
          return h.response('logged in').code(statusCodes.ok)
        }
      }
      return h.continue
    })

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/login'
    })

    expect(loginCalled).toBe(true)
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toBe('logged in')
  })
})
