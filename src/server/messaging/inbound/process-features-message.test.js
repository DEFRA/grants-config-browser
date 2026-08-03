import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processFeaturesMessage } from './process-features-message.js'
import { switchAuth } from '../../helpers/auth-switch.js'
import { AUTH_CONTROL_NAME } from '../../common/constants/constants.js'

vi.mock('../../helpers/auth-switch.js', () => ({
  switchAuth: vi.fn()
}))

vi.mock('../../common/constants/constants.js', () => ({
  AUTH_CONTROL_NAME: 'CONFIG_BROWSER_SERVICE_AUTH_ENABLED'
}))

describe('processFeaturesMessage', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn()
  }

  const defaultAttributes = {
    name: AUTH_CONTROL_NAME,
    scopes: ['service.config-browser'],
    updatedBy: 'test-user',
    valueType: 'boolean'
  }

  const mockMessage = { some: 'data' }
  const sentTimestamp = '123456789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should log message receipt and call switchAuth if scope and name match', async () => {
    await processFeaturesMessage(mockMessage, mockLogger, defaultAttributes, sentTimestamp)

    expect(mockLogger.info).toHaveBeenCalledWith(
      `Received Feature control notification: ${AUTH_CONTROL_NAME} (boolean), scopes: ${defaultAttributes.scopes}, updatedBy: test-user`
    )
    expect(switchAuth).toHaveBeenCalledWith(mockMessage, mockLogger)
  })

  it('should log "Not a control of interest, ignoring" if scope does not match', async () => {
    const attributes = {
      ...defaultAttributes,
      scopes: ['other-service']
    }

    await processFeaturesMessage(mockMessage, mockLogger, attributes, sentTimestamp)

    expect(mockLogger.info).toHaveBeenCalledWith(
      `Received Feature control notification: ${AUTH_CONTROL_NAME} (boolean), scopes: other-service, updatedBy: test-user`
    )
    expect(mockLogger.info).toHaveBeenCalledWith('Not a control of interest, ignoring')
    expect(switchAuth).not.toHaveBeenCalled()
  })

  it('should not call switchAuth if scope matches but name does not', async () => {
    const attributes = {
      ...defaultAttributes,
      name: 'OTHER_CONTROL'
    }

    await processFeaturesMessage(mockMessage, mockLogger, attributes, sentTimestamp)

    expect(mockLogger.info).toHaveBeenCalledWith(
      `Received Feature control notification: OTHER_CONTROL (boolean), scopes: ${attributes.scopes}, updatedBy: test-user`
    )
    expect(mockLogger.info).not.toHaveBeenCalledWith('Not a control of interest, ignoring')
    expect(switchAuth).not.toHaveBeenCalled()
  })

  it('should catch and log error if thrown', async () => {
    // Cause an error by passing null attributes
    await processFeaturesMessage(mockMessage, mockLogger, null, sentTimestamp)

    expect(mockLogger.error).toHaveBeenCalledWith(expect.any(TypeError), 'Unable to process Input request:')
  })
})
