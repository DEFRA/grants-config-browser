import { config } from '../../config/config.js'
import { buildRedisClient } from '../common/helpers/redis-client.js'

const REDIS_MESSAGES_KEY = 'sqs-messages'
let redisClient

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = await buildRedisClient(config.get('redis'))
  }
  return redisClient
}

export const notificationsController = {
  async handler(_request, h) {
    const client = await getRedisClient()
    const existingMessagesJson = await client.get(REDIS_MESSAGES_KEY)
    const messages = (
      existingMessagesJson ? JSON.parse(existingMessagesJson) : []
    ).reverse()

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
