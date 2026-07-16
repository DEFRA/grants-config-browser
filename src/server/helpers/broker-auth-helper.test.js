import { config } from '../../config/config.js'
import { createAuthenticatedHeaders, createApiHeadersForConfigBroker } from './broker-auth-helper.js'
import { generateToken } from '../common/helpers/sts/grants-config-broker-token.js'

vi.mock('../../config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock('../common/helpers/sts/grants-config-broker-token.js', () => ({
  generateToken: vi.fn()
}))

describe('Broker Auth Helper', () => {
  const MOCK_TOKEN = 'mock-sts-token'
  const CONTENT_TYPE_JSON = 'application/json'
  let mockRequest

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest = {
      sts: {
        send: vi.fn()
      }
    }
    vi.mocked(generateToken).mockResolvedValue(MOCK_TOKEN)
  })

  describe('createAuthenticatedHeaders', () => {
    it('should add Authorization header with token from generateToken', async () => {
      const baseHeaders = { 'X-Custom': 'value' }

      const headers = await createAuthenticatedHeaders(mockRequest, baseHeaders)

      expect(generateToken).toHaveBeenCalledWith(mockRequest.sts)
      expect(headers).toEqual({
        'X-Custom': 'value',
        Authorization: `Bearer ${MOCK_TOKEN}`
      })
    })

    it('should work without base headers', async () => {
      const headers = await createAuthenticatedHeaders(mockRequest)

      expect(generateToken).toHaveBeenCalledWith(mockRequest.sts)
      expect(headers).toEqual({
        Authorization: `Bearer ${MOCK_TOKEN}`
      })
    })

    it('should not mutate original base headers object', async () => {
      const baseHeaders = { 'Content-Type': CONTENT_TYPE_JSON }

      const headers = await createAuthenticatedHeaders(mockRequest, baseHeaders)

      expect(baseHeaders).toEqual({ 'Content-Type': CONTENT_TYPE_JSON })
      expect(headers.Authorization).toBe(`Bearer ${MOCK_TOKEN}`)
    })
  })

  describe('createApiHeadersForConfigBroker', () => {
    it('should return headers with Content-Type and Authorization when serviceAuthEnabled is true', async () => {
      vi.mocked(config.get).mockReturnValueOnce(false) // legacy disabled
      vi.mocked(config.get).mockReturnValueOnce(true) // serviceAuthEnabled

      const headers = await createApiHeadersForConfigBroker(mockRequest)

      expect(generateToken).toHaveBeenCalledWith(mockRequest.sts)
      expect(headers).toEqual({
        'Content-Type': CONTENT_TYPE_JSON,
        Authorization: `Bearer ${MOCK_TOKEN}`
      })
    })

    it('should return only Content-Type header when serviceAuthEnabled is false', async () => {
      vi.mocked(config.get).mockReturnValueOnce(false) // legacy disabled
      vi.mocked(config.get).mockReturnValueOnce(false) // serviceAuthEnabled

      const headers = await createApiHeadersForConfigBroker(mockRequest)

      expect(generateToken).not.toHaveBeenCalled()
      expect(headers).toEqual({
        'Content-Type': CONTENT_TYPE_JSON
      })
    })
  })
})
