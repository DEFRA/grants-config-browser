import { processInputMessage } from './process-message.js'
import { buildRedisClient } from '../../common/helpers/redis-client.js'

vi.mock('../../deploy-version.js')
vi.mock('../../utils/get-service-version.js')
vi.mock('../outbound/notify-version.js')
vi.mock('@defra/grants-config-utils/s3-interactions')
vi.mock('../../common/helpers/redis-client.js')

describe('Process Message test', () => {
  const mockLogger = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }

  const mockRedisClient = {
    get: vi.fn(),
    set: vi.fn()
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    buildRedisClient.mockResolvedValue(mockRedisClient)
    mockRedisClient.set.mockResolvedValue('OK')
  })

  it('should cache message in redis when no previous message stored', async () => {
    const attributes = {
      grant: 'some-grant',
      version: '1.0.0'
    }
    const message = ['file1.txt']
    mockRedisClient.get.mockResolvedValueOnce(null)

    await processInputMessage(message, mockLogger, attributes)

    expect(mockRedisClient.get).toHaveBeenCalledWith('sqs-messages')
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'sqs-messages',
      JSON.stringify([{ attributes, body: message }])
    )
  })

  it('should cache message in redis when previous message stored', async () => {
    const attributes = {
      grant: 'some-grant',
      version: '1.0.0'
    }
    const message = ['file1.txt']
    mockRedisClient.get.mockResolvedValueOnce(
      JSON.stringify([{ existing: 'msg' }])
    )

    await processInputMessage(message, mockLogger, attributes)

    expect(mockRedisClient.get).toHaveBeenCalledWith('sqs-messages')
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'sqs-messages',
      JSON.stringify([{ existing: 'msg' }, { attributes, body: message }])
    )
  })

  it('should catch and log error if thrown', async () => {
    mockRedisClient.get.mockThrowOnce(new Error('cache not ready'))
    await processInputMessage(
      {
        grant: 'some-grant',
        version: '1.0.0'
      },
      mockLogger,
      ['file1.txt']
    )

    expect(mockLogger.error).toHaveBeenCalledWith(
      new Error('cache not ready'),
      'Unable to process Input request:'
    )
  })
})
