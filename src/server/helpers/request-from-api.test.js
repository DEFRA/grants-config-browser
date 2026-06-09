import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { requestFromApi } from './request-from-api.js'
import { config } from '../../config/config.js'
import { createApiHeadersForConfigBroker } from './broker-auth-helper.js'

vi.mock('../../config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock('./broker-auth-helper.js', () => ({
  createApiHeadersForConfigBroker: vi.fn()
}))

describe('requestFromApi', () => {
  const mockRequest = {
    logger: {
      error: vi.fn()
    }
  }

  const mockEndpoint = 'test-endpoint'
  const mockApiEndpoint = 'https://api.example.com'

  beforeEach(() => {
    vi.clearAllMocks()
    config.get.mockReturnValue(mockApiEndpoint)
    createApiHeadersForConfigBroker.mockReturnValue({ Authorization: 'Bearer test-token' })
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return undefined if GRANTS_CONFIG_BROKER_ENDPOINT is not configured', async () => {
    config.get.mockReturnValue(null)
    const result = await requestFromApi(mockEndpoint, mockRequest)
    expect(result).toBeUndefined()
  })

  it('should perform a successful GET request', async () => {
    const mockResponseData = { data: 'test' }
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponseData
    })

    const result = await requestFromApi(mockEndpoint, mockRequest, { 'x-test': 'value' })

    expect(global.fetch).toHaveBeenCalledWith(`${mockApiEndpoint}/api/${mockEndpoint}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
        'x-test': 'value'
      }
    })
    expect(result).toEqual({ response: mockResponseData, status: 200 })
  })

  it('should use provided otherHeaders', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({})
    })

    await requestFromApi(mockEndpoint, mockRequest, { 'x-custom': 'header' })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-custom': 'header'
        })
      })
    )
  })

  it('should perform a successful POST request with payload', async () => {
    const mockResponseData = { success: true }
    const payload = { key: 'value' }
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockResponseData
    })

    const result = await requestFromApi(mockEndpoint, mockRequest, {}, 'POST', payload)

    expect(global.fetch).toHaveBeenCalledWith(`${mockApiEndpoint}/api/${mockEndpoint}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify(payload)
    })
    expect(result).toEqual({ response: mockResponseData, status: 201 })
  })

  it('should log an error if the response is not ok', async () => {
    const mockResponseData = { error: 'Bad Request' }
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => mockResponseData
    })

    const result = await requestFromApi(mockEndpoint, mockRequest)

    expect(mockRequest.logger.error).toHaveBeenCalledWith({})
    expect(result).toEqual({ response: mockResponseData, status: 400 })
  })

  it('should log an error and return undefined if fetch throws', async () => {
    const error = new Error('Network failure')
    global.fetch.mockRejectedValueOnce(error)

    const result = await requestFromApi(mockEndpoint, mockRequest)

    expect(mockRequest.logger.error).toHaveBeenCalledWith({})
    expect(result).toBeUndefined()
  })

  it('should handle other methods like PUT', async () => {
    const mockResponseData = { updated: true }
    const payload = { id: 1 }
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponseData
    })

    await requestFromApi(mockEndpoint, mockRequest, {}, 'PUT', payload)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(payload)
      })
    )
  })
})
