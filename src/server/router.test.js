import { router } from './router.js'
import { config } from '../config/config.js'
import Hapi from '@hapi/hapi'

vi.mock('../config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'log') {
        return {
          enabled: false,
          redact: [],
          level: 'info',
          format: 'pino-pretty'
        }
      }
      if (key === 'serviceName') return 'test-service'
      if (key === 'serviceVersion') return '1.0.0'
      if (key === 'assetPath') return '/public'
      if (key === 'staticCacheTimeout') return 3600
      return null
    })
  }
}))

vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn().mockReturnValue('swagger: "2.0"')
  }
}))

vi.mock('js-yaml', () => ({
  default: {
    load: vi.fn().mockReturnValue({})
  }
}))

describe('router', () => {
  let server

  beforeEach(async () => {
    server = Hapi.server()
    server.auth.scheme('mock', () => ({
      authenticate: (request, h) => h.authenticated({ credentials: {} })
    }))
    server.auth.strategy('session', 'mock')
    server.auth.default('session')
  })

  test('should include mock routes when enableMocking is set to true', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'auth.federatedCredentials.enableMocking') return true
      if (key === 'session.cookie') return { password: 'password-must-be-at-least-32-characters-long' }
      if (key === 'assetPath') return '/public'
      if (key === 'staticCacheTimeout') return 3600
      if (key === 'log') {
        return {
          enabled: false,
          redact: [],
          level: 'info',
          format: 'pino-pretty'
        }
      }
      return null
    })

    await server.register(router.plugin)

    const routes = server.table().map((r) => r.path)

    // Check for some mock routes
    expect(routes).toContain('/.well-known/openid-configuration')
    expect(routes).toContain('/authorize')
    expect(routes).toContain('/token')
  })

  test('should NOT include mock routes when enableMocking is set to false', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'auth.federatedCredentials.enableMocking') return false
      if (key === 'session.cookie') return { password: 'password-must-be-at-least-32-characters-long' }
      if (key === 'assetPath') return '/public'
      if (key === 'staticCacheTimeout') return 3600
      if (key === 'log') {
        return {
          enabled: false,
          redact: [],
          level: 'info',
          format: 'pino-pretty'
        }
      }
      return null
    })

    await server.register(router.plugin)

    const routes = server.table().map((r) => r.path)

    expect(routes).not.toContain('/.well-known/openid-configuration')
    expect(routes).not.toContain('/authorize')
  })

  test('should always include standard routes', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'auth.federatedCredentials.enableMocking') return false
      if (key === 'session.cookie') return { password: 'password-must-be-at-least-32-characters-long' }
      if (key === 'assetPath') return '/public'
      if (key === 'staticCacheTimeout') return 3600
      if (key === 'log') {
        return {
          enabled: false,
          redact: [],
          level: 'info',
          format: 'pino-pretty'
        }
      }
      return null
    })

    await server.register(router.plugin)

    const routes = server.table().map((r) => r.path)

    expect(routes).toContain('/')
    expect(routes).toContain('/about')
    expect(routes).toContain('/health')
    expect(routes).toContain('/login')
    expect(routes).toContain('/logout')
    expect(routes).toContain('/auth')
    expect(routes).toContain('/documentation')
  })
})
