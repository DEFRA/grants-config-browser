import { describe, test, expect, vi, beforeEach } from 'vitest'
import { switchAuth, retrieveAndSetInitialAuthOption } from './auth-switch.js'
import { config } from '../../config/config.js'
import { requestFromApi } from './request-from-api.js'
import { AUTH_CONTROL_NAME } from '../common/constants/constants.js'

vi.mock('../../config/config.js', () => ({
  config: {
    set: vi.fn(),
    get: vi.fn()
  }
}))

vi.mock('./request-from-api.js', () => ({
  requestFromApi: vi.fn()
}))

vi.mock('../common/constants/constants.js', () => ({
  AUTH_CONTROL_NAME: 'AUTH_CONTROL'
}))

describe('auth-switch', () => {
  const mockLogger = {
    info: vi.fn()
  }

  const mockServer = {
    logger: mockLogger
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('switchAuth', () => {
    test('Should enable service auth and disable legacy auth when serviceAuthEnabled is true', () => {
      switchAuth(true, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith('Service Auth enabled')
      expect(config.set).toHaveBeenCalledWith('backend.serviceAuth.enabled', true)
      expect(config.set).toHaveBeenCalledWith('backend.legacyAuth.enabled', false)
    })

    test('Should disable service auth and enable legacy auth when serviceAuthEnabled is false', () => {
      switchAuth(false, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith('Service Auth disabled')
      expect(config.set).toHaveBeenCalledWith('backend.serviceAuth.enabled', false)
      expect(config.set).toHaveBeenCalledWith('backend.legacyAuth.enabled', true)
    })
  })

  describe('retrieveAndSetInitialAuthOption', () => {
    test('Should not request from API if checkOnStartup is false', async () => {
      config.get.mockReturnValue(false)

      await retrieveAndSetInitialAuthOption(mockServer)

      expect(config.get).toHaveBeenCalledWith('backend.serviceAuth.checkOnStartup')
      expect(requestFromApi).not.toHaveBeenCalled()
    })

    test('Should request from API and switch auth if checkOnStartup is true and API returns result', async () => {
      config.get.mockReturnValue(true)
      requestFromApi.mockResolvedValue({
        response: {
          value: true
        }
      })

      await retrieveAndSetInitialAuthOption(mockServer)

      expect(config.get).toHaveBeenCalledWith('backend.serviceAuth.checkOnStartup')
      expect(requestFromApi).toHaveBeenCalledWith(`feature-control/${AUTH_CONTROL_NAME}`, mockServer)
      expect(mockLogger.info).toHaveBeenCalledWith('Service Auth enabled')
      expect(config.set).toHaveBeenCalledWith('backend.serviceAuth.enabled', true)
      expect(config.set).toHaveBeenCalledWith('backend.legacyAuth.enabled', false)
    })

    test('Should request from API and not switch auth if checkOnStartup is true and API returns no result', async () => {
      config.get.mockReturnValue(true)
      requestFromApi.mockResolvedValue(null)

      await retrieveAndSetInitialAuthOption(mockServer)

      expect(config.get).toHaveBeenCalledWith('backend.serviceAuth.checkOnStartup')
      expect(requestFromApi).toHaveBeenCalledWith(`feature-control/${AUTH_CONTROL_NAME}`, mockServer)
      expect(config.set).not.toHaveBeenCalled()
    })
  })
})
