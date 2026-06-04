import { processInputMessage } from './process-message.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { SqsSubscriber } from '../../common/helpers/sqs/sqs-subscriber.js'
import { config } from '../../../config/config.js'

let inputMessageSubscriber

export async function configureAndStartMessaging() {
  const onMessage = async (message, attributes) => {
    createLogger().info(attributes, 'Received incoming message')
    await processInputMessage(message, createLogger(), attributes)
  }
  inputMessageSubscriber = new SqsSubscriber({
    queueUrl: config.get('aws.sqs.newConfigQueueUrl'),
    logger: createLogger(),
    region: config.get('aws.region'),
    awsEndpointUrl: config.get('aws.endpointUrl'),
    onMessage
  })

  await inputMessageSubscriber.start()
  return onMessage
}

export async function stopMessageSubscriber() {
  if (inputMessageSubscriber) {
    await inputMessageSubscriber.stop()
  }
}
