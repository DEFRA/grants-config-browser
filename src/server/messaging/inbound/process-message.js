import { config } from '../../../config/config.js'
import { buildRedisClient } from '../../common/helpers/redis-client.js'
import { subMonths } from 'date-fns'

const REDIS_MESSAGES_KEY = 'sqs-messages'
let redisClient

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = buildRedisClient(config.get('redis'))
  }
  return redisClient
}

export const processInputMessage = async (message, logger, attributes, sentTimestamp) => {
  try {
    const { grant, version, status } = attributes

    logger.info(`Received New Config notification for grant: ${grant}, version: ${version}, status: ${status}`)

    const client = await getRedisClient()
    const existingMessagesJson = await client.get(REDIS_MESSAGES_KEY)
    let messages = existingMessagesJson ? JSON.parse(existingMessagesJson) : []
    messages.push({ attributes, body: message, sentTimestamp })
    //remove any messages that don't have a sentTimestamp (the very oldest ones, no longer relevant)
    messages = messages.filter((msg) => msg.sentTimestamp)
    //remove any messages that are older than 1 month
    const oneMonthAgo = subMonths(new Date(), 1).getTime()
    messages = messages.filter((msg) => msg.sentTimestamp > oneMonthAgo)
    await client.set(REDIS_MESSAGES_KEY, JSON.stringify(messages))
  } catch (err) {
    logger.error(err, 'Unable to process Input request:')
  }
}
