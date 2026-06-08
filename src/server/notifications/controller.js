import { config } from '../../config/config.js'
import { buildRedisClient } from '../common/helpers/redis-client.js'
import { formatDateTime } from '../helpers/date-display.js'

const REDIS_MESSAGES_KEY = 'sqs-messages'
let redisClient

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = buildRedisClient(config.get('redis'))
  }
  return redisClient
}

export const notificationsController = {
  async handler(_request, h) {
    const client = await getRedisClient()
    const existingMessagesJson = await client.get(REDIS_MESSAGES_KEY)
    const messages = (
      existingMessagesJson ? JSON.parse(existingMessagesJson) : []
    )
      .sort((a, b) => {
        if (!a.sentTimestamp && !b.sentTimestamp) return 0
        if (!a.sentTimestamp) return 1
        if (!b.sentTimestamp) return -1
        return b.sentTimestamp - a.sentTimestamp
      })
      .map((message) => ({
        ...message,
        sentTimestamp: message.sentTimestamp
          ? formatDateTime(Number(message.sentTimestamp))
          : '_'
      }))

    return h.view('notifications/index', {
      pageTitle: 'Notifications',
      heading: 'Notifications',
      messages,
      breadcrumbs: [
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Notifications'
        }
      ]
    })
  }
}
