import { describe, it, expect, vi, beforeEach } from 'vitest'
import { featureControl } from './index.js'

describe('featureControl plugin', () => {
  const server = {
    route: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register routes correctly', () => {
    featureControl.plugin.register(server)

    expect(server.route).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        method: 'GET',
        path: '/feature-control/detail'
      }),
      expect.objectContaining({
        method: 'GET',
        path: '/feature-control/update'
      }),
      expect.objectContaining({
        method: 'POST',
        path: '/feature-control/update'
      })
    ]))
  })

  it('should have the correct plugin name', () => {
    expect(featureControl.plugin.name).toBe('featureControl')
  })
})
