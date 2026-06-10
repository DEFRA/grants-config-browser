import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiController } from './controller.js'
import { requestFromApi } from '../helpers/request-from-api.js'

vi.mock('../helpers/request-from-api.js')

describe('apiController', () => {
  const mockRequest = {
    method: 'GET',
    url: new URL('http://localhost:3000/api/latestVersion?grant=test'),
    headers: {},
    logger: {
      error: vi.fn()
    }
  }

  const mockH = {
    response: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should proxy GET request successfully', async () => {
    requestFromApi.mockResolvedValueOnce({ response: { success: true }, status: 200 })

    await apiController.handler(mockRequest, mockH)

    expect(requestFromApi).toHaveBeenCalledWith('latestVersion?grant=test', mockRequest, {}, 'GET', undefined)

    expect(mockH.response).toHaveBeenCalledWith({ success: true })
  })

  it('should proxy POST request with payload', async () => {
    requestFromApi.mockResolvedValueOnce({ response: { success: true }, status: 200 })
    const postRequest = {
      ...mockRequest,
      method: 'POST',
      url: new URL('http://localhost:3000/api/release-config'),
      payload: { grant: 'test', version: '1.0.0' }
    }

    await apiController.handler(postRequest, mockH)

    expect(requestFromApi).toHaveBeenCalledWith('release-config', postRequest, {}, 'POST', {
      grant: 'test',
      version: '1.0.0'
    })

    expect(mockH.response).toHaveBeenCalledWith({ success: true })
  })

  it('should return non OK response if helper returns one', async () => {
    requestFromApi.mockResolvedValueOnce({ response: { error: 'Config broker endpoint not configured' }, status: 404 })
    await apiController.handler(mockRequest, mockH)
    expect(mockH.response).toHaveBeenCalledWith({ error: 'Config broker endpoint not configured' })
    expect(mockH.code).toHaveBeenCalledWith(404)
  })

  it('should return 500 response if call fails', async () => {
    requestFromApi.mockThrowOnce(new Error('Network error'))
    await apiController.handler(mockRequest, mockH)
    expect(mockH.response).toHaveBeenCalledWith({ error: 'Internal Server Error' })
    expect(mockH.code).toHaveBeenCalledWith(500)
  })
})
