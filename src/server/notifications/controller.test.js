import { vi } from 'vitest'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { buildRedisClient } from '../common/helpers/redis-client.js'

vi.mock('../common/helpers/redis-client.js')

describe('#notificationsController', () => {
  let server
  const mockRedisClient = {
    get: vi.fn()
  }

  beforeAll(async () => {
    buildRedisClient.mockResolvedValue(mockRedisClient)
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response with no messages', async () => {
    mockRedisClient.get.mockResolvedValueOnce(null)
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/notifications'
    })

    expect(result).toEqual(expect.stringContaining('Notifications'))
    expect(result).toEqual(
      expect.stringContaining('No recent notifications received.')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should provide expected response with messages', async () => {
    const messages = [
      {
        attributes: {
          grant: 'test-grant',
          version: '1.0.0',
          status: 'published',
          user: 'test-user'
        },
        body: ['file1.txt', 'file2.txt']
      }
    ]
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(messages))
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/notifications'
    })

    expect(result).toEqual(expect.stringContaining('Notifications'))
    expect(result).toEqual(expect.stringContaining('grant'))
    expect(result).toEqual(expect.stringContaining('test-grant'))
    expect(result).toEqual(expect.stringContaining('version'))
    expect(result).toEqual(expect.stringContaining('1.0.0'))
    expect(result).toEqual(expect.stringContaining('status'))
    expect(result).toEqual(expect.stringContaining('published'))
    expect(result).toEqual(expect.stringContaining('user'))
    expect(result).toEqual(expect.stringContaining('test-user'))
    expect(result).toEqual(expect.stringContaining('file1.txt'))
    expect(statusCode).toBe(statusCodes.ok)
  })
})
