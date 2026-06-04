import { config } from '../../../config/config.js'
import { buildRedisClient } from '../../common/helpers/redis-client.js'

const REDIS_MESSAGES_KEY = 'sqs-messages'
let redisClient

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = await buildRedisClient(config.get('redis'))
  }
  return redisClient
}

export const processInputMessage = async (message, logger, attributes) => {
  try {
    const { grant, version, status } = attributes

    logger.info(
      `Received New Config notification for grant: ${grant}, version: ${version}, status: ${status}`
    )

    const client = await getRedisClient()
    const existingMessagesJson = await client.get(REDIS_MESSAGES_KEY)
    const messages = existingMessagesJson
      ? JSON.parse(existingMessagesJson)
      : []
    messages.push({ attributes, body: message })
    await client.set(REDIS_MESSAGES_KEY, JSON.stringify(messages))
  } catch (err) {
    logger.error(err, 'Unable to process Input request:')
  }
}
