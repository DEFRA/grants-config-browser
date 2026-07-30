import { config } from '../../../config/config.js'
export const processFeaturesMessage = async (message, logger, attributes, sentTimestamp) => {
  try {
    const { name, scopes, updatedBy, valueType } = attributes

    logger.info(
      `Received Feature control notification: ${name} (${valueType}), scopes: ${scopes}, updatedBy: ${updatedBy}`
    )
    if (scopes.some((scope) => scope === 'service.config-browser')) {
      if (name === 'SERVICE_AUTH_ENABLED') {
        logger.info(message)
        if (message) {
          logger.info('Service Auth enabled')
          config.set('backend.serviceAuth.enabled', true)
          config.set('backend.legacyAuth.enabled', false)
        } else {
          logger.info('Service Auth disabled')
          config.set('backend.serviceAuth.enabled', false)
          config.set('backend.legacyAuth.enabled', true)
        }
      }
    } else {
      logger.info('Not a control of interest, ignoring')
    }
  } catch (err) {
    logger.error(err, 'Unable to process Input request:')
  }
}
