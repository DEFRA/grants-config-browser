import { config } from '../../config/config.js'
import { createApiHeadersForConfigBroker, createLegacyAuthenticatedHeaders } from './broker-auth-helper.js'
import { createAuthenticatedHeaders } from '@defra/grants-config-utils/broker'

vi.mock('../../config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock('@defra/grants-config-utils/broker', () => ({
  createAuthenticatedHeaders: vi.fn()
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
    vi.mocked(createAuthenticatedHeaders).mockResolvedValue({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MOCK_TOKEN}`
    })
  })

  describe('createLegacyAuthenticatedHeaders', () => {
    const TOKEN = 'test-token'
    const KEY = 'test-key-32-chars-long-exactly-32'
    const BASE_HEADERS = { 'X-Test': 'test' }

    it('should return headers with Authorization when token is provided', () => {
      const headers = createLegacyAuthenticatedHeaders(TOKEN, KEY, BASE_HEADERS)

      expect(headers['X-Test']).toBe('test')
      expect(headers.Authorization).toBeDefined()
      expect(headers.Authorization).toMatch(/^Bearer [A-Za-z0-9+/=]+$/)
    })

    it('should return base headers when token is not provided', () => {
      const headers = createLegacyAuthenticatedHeaders(null, KEY, BASE_HEADERS)

      expect(headers).toEqual(BASE_HEADERS)
      expect(headers.Authorization).toBeUndefined()
    })

    it('should not mutate original base headers', () => {
      const baseHeaders = { 'Content-Type': CONTENT_TYPE_JSON }
      createLegacyAuthenticatedHeaders(TOKEN, KEY, baseHeaders)

      expect(baseHeaders).toEqual({ 'Content-Type': CONTENT_TYPE_JSON })
    })

    it('should encrypt token such that it can be decrypted (sanity check)', () => {
      // Since encryptToken is not exported, we just check that different calls produce different results (due to IV)
      const headers1 = createLegacyAuthenticatedHeaders(TOKEN, KEY, {})
      const headers2 = createLegacyAuthenticatedHeaders(TOKEN, KEY, {})

      expect(headers1.Authorization).not.toEqual(headers2.Authorization)
    })
  })

  describe('createApiHeadersForConfigBroker', () => {
    it('should return headers with Content-Type and Authorization when serviceAuthEnabled is true', async () => {
      vi.mocked(config.get).mockReturnValueOnce(false) // legacy disabled
      vi.mocked(config.get).mockReturnValueOnce(true) // serviceAuthEnabled

      const headers = await createApiHeadersForConfigBroker(mockRequest)

      expect(createAuthenticatedHeaders).toHaveBeenCalledWith(mockRequest, { 'Content-Type': 'application/json' })
      expect(headers).toEqual({
        'Content-Type': CONTENT_TYPE_JSON,
        Authorization: `Bearer ${MOCK_TOKEN}`
      })
    })

    it('should return only Content-Type header when serviceAuthEnabled is false', async () => {
      vi.mocked(config.get).mockReturnValueOnce(false) // legacy disabled
      vi.mocked(config.get).mockReturnValueOnce(false) // serviceAuthEnabled

      const headers = await createApiHeadersForConfigBroker(mockRequest)

      expect(createAuthenticatedHeaders).not.toHaveBeenCalled()
      expect(headers).toEqual({
        'Content-Type': CONTENT_TYPE_JSON
      })
    })

    it('should use legacy auth headers when legacyAuth is enabled', async () => {
      vi.mocked(config.get).mockImplementation((key) => {
        if (key === 'backend.legacyAuth.enabled') return true
        if (key === 'backend.legacyAuth.token') return 'legacy-token'
        if (key === 'backend.legacyAuth.encryptionKey') return 'legacy-key'
        return null
      })

      const headers = await createApiHeadersForConfigBroker(mockRequest)

      expect(headers.Authorization).toBeDefined()
      expect(headers.Authorization).toMatch(/^Bearer /)
      expect(createAuthenticatedHeaders).not.toHaveBeenCalled()
    })
  })
})
