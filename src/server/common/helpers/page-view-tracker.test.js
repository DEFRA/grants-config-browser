import { vi } from 'vitest'
import hapi from '@hapi/hapi'
import { metrics } from '@defra/cdp-metrics'
import { pageViewTracker } from './page-view-tracker.js'

// Mock metrics plugin as it depends on aws-embedded-metrics which might not be configured/available
vi.mock('@defra/cdp-metrics', () => {
  const mockCounter = vi.fn().mockResolvedValue(undefined)
  return {
    metrics: {
      plugin: {
        name: 'metrics',
        register: (server) => {
          server.decorate('request', 'metrics', {
            counter: mockCounter
          })
        }
      }
    },
    mockCounter // export for test access
  }
})

import { mockCounter } from '@defra/cdp-metrics'

describe('pageViewTracker', () => {
  let server

  beforeEach(async () => {
    server = hapi.server()
    await server.register([metrics, pageViewTracker])

    server.route({
      method: 'GET',
      path: '/test-page',
      handler: () => 'ok'
    })

    mockCounter.mockClear()
  })

  test('should record a page view metric with the correct path', async () => {
    await server.inject({
      method: 'GET',
      url: '/test-page'
    })

    expect(mockCounter).toHaveBeenCalledWith('page-viewed', 1, { path: '/test-page' })
  })

  test('should record metrics for different paths', async () => {
    server.route({
      method: 'GET',
      path: '/another-page',
      handler: () => 'ok'
    })

    await server.inject({
      method: 'GET',
      url: '/another-page'
    })

    expect(mockCounter).toHaveBeenCalledWith('page-viewed', 1, { path: '/another-page' })
  })

  test('should NOT record metrics for health check', async () => {
    server.route({
      method: 'GET',
      path: '/health',
      handler: () => 'ok'
    })

    await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(mockCounter).not.toHaveBeenCalled()
  })

  test('should NOT record metrics for static assets', async () => {
    server.route({
      method: 'GET',
      path: '/public/styles.css',
      handler: () => 'ok'
    })

    await server.inject({
      method: 'GET',
      url: '/public/styles.css'
    })

    expect(mockCounter).not.toHaveBeenCalled()
  })

  test('should NOT record metrics for favicon', async () => {
    server.route({
      method: 'GET',
      path: '/favicon.ico',
      handler: () => 'ok'
    })

    await server.inject({
      method: 'GET',
      url: '/favicon.ico'
    })

    expect(mockCounter).not.toHaveBeenCalled()
  })
})
