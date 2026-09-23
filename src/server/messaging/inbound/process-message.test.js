import { vi } from 'vitest'
import { subDays, subMonths } from 'date-fns'
import { processInputMessage } from './process-message.js'
import { buildRedisClient } from '../../common/helpers/redis-client.js'

vi.mock('../../common/helpers/redis-client.js')

describe('Process Message test', () => {
  const mockNow = new Date('2026-06-25T12:00:00.000Z')

  const mockLogger = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }

  const mockRedisClient = {
    get: vi.fn(),
    set: vi.fn()
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
    vi.clearAllMocks()
    buildRedisClient.mockResolvedValue(mockRedisClient)
    mockRedisClient.set.mockResolvedValue('OK')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should cache message in redis when no previous message stored', async () => {
    const attributes = {
      grant: 'some-grant',
      version: '1.0.0',
      status: 'active'
    }
    const message = ['file1.txt']
    const sentTimestamp = mockNow.getTime()
    mockRedisClient.get.mockResolvedValueOnce(null)

    await processInputMessage(message, mockLogger, attributes, sentTimestamp)

    expect(mockRedisClient.get).toHaveBeenCalledWith('sqs-messages')
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'sqs-messages',
      JSON.stringify([{ attributes, body: message, sentTimestamp }])
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Received New Config notification for grant: some-grant, version: 1.0.0, status: active'
    )
  })

  it('should cache message in redis when previous valid message stored', async () => {
    const attributes = {
      grant: 'some-grant',
      version: '1.0.0',
      status: 'active'
    }
    const message = ['file1.txt']
    const sentTimestamp = mockNow.getTime()
    const existingMessage = {
      attributes: { grant: 'other-grant', version: '0.9.0', status: 'draft' },
      body: ['file0.txt'],
      sentTimestamp: subDays(mockNow, 5).getTime()
    }

    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify([existingMessage]))

    await processInputMessage(message, mockLogger, attributes, sentTimestamp)

    expect(mockRedisClient.get).toHaveBeenCalledWith('sqs-messages')
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'sqs-messages',
      JSON.stringify([existingMessage, { attributes, body: message, sentTimestamp }])
    )
  })

  it('should remove legacy messages that do not have a sentTimestamp', async () => {
    const attributes = {
      grant: 'some-grant',
      version: '1.0.0',
      status: 'active'
    }
    const message = ['file1.txt']
    const sentTimestamp = mockNow.getTime()
    const legacyMessageWithoutTimestamp = {
      attributes: { grant: 'legacy-grant', version: '0.1.0' },
      body: ['legacy.txt']
    }
    const validExistingMessage = {
      attributes: { grant: 'valid-grant', version: '0.2.0' },
      body: ['valid.txt'],
      sentTimestamp: subDays(mockNow, 10).getTime()
    }

    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify([legacyMessageWithoutTimestamp, validExistingMessage]))

    await processInputMessage(message, mockLogger, attributes, sentTimestamp)

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'sqs-messages',
      JSON.stringify([validExistingMessage, { attributes, body: message, sentTimestamp }])
    )
  })

  it('should remove messages that are older than 1 month', async () => {
    const attributes = {
      grant: 'some-grant',
      version: '1.0.0',
      status: 'active'
    }
    const message = ['file1.txt']
    const sentTimestamp = mockNow.getTime()
    const oldMessage = {
      attributes: { grant: 'old-grant', version: '0.1.0' },
      body: ['old.txt'],
      sentTimestamp: subMonths(mockNow, 2).getTime()
    }
    const recentMessage = {
      attributes: { grant: 'recent-grant', version: '0.2.0' },
      body: ['recent.txt'],
      sentTimestamp: subDays(mockNow, 10).getTime()
    }

    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify([oldMessage, recentMessage]))

    await processInputMessage(message, mockLogger, attributes, sentTimestamp)

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'sqs-messages',
      JSON.stringify([recentMessage, { attributes, body: message, sentTimestamp }])
    )
  })

  it('should filter out messages older than or equal to the 1 month boundary', async () => {
    const attributes = {
      grant: 'some-grant',
      version: '1.0.0',
      status: 'active'
    }
    const message = ['file1.txt']
    const sentTimestamp = mockNow.getTime()
    const oneMonthAgoTimestamp = subMonths(mockNow, 1).getTime()

    const exactlyOneMonthAgoMessage = {
      attributes: { grant: 'boundary-exact' },
      body: ['exact.txt'],
      sentTimestamp: oneMonthAgoTimestamp
    }
    const slightlyOlderMessage = {
      attributes: { grant: 'boundary-older' },
      body: ['older.txt'],
      sentTimestamp: oneMonthAgoTimestamp - 1000
    }
    const slightlyNewerMessage = {
      attributes: { grant: 'boundary-newer' },
      body: ['newer.txt'],
      sentTimestamp: oneMonthAgoTimestamp + 1000
    }

    mockRedisClient.get.mockResolvedValueOnce(
      JSON.stringify([slightlyOlderMessage, exactlyOneMonthAgoMessage, slightlyNewerMessage])
    )

    await processInputMessage(message, mockLogger, attributes, sentTimestamp)

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'sqs-messages',
      JSON.stringify([slightlyNewerMessage, { attributes, body: message, sentTimestamp }])
    )
  })

  it('should catch and log error if thrown', async () => {
    mockRedisClient.get.mockRejectedValueOnce(new Error('cache not ready'))
    await processInputMessage(
      ['file1.txt'],
      mockLogger,
      {
        grant: 'some-grant',
        version: '1.0.0',
        status: 'active'
      },
      mockNow.getTime()
    )

    expect(mockLogger.error).toHaveBeenCalledWith(new Error('cache not ready'), 'Unable to process Input request:')
  })
})
