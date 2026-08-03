import { AUTH_CONTROL_NAME } from '../../common/constants/constants.js'
import { switchAuth } from '../../helpers/auth-switch.js'
export const processFeaturesMessage = async (message, logger, attributes, _sentTimestamp) => {
  try {
    const { name, scopes, updatedBy, valueType } = attributes

    logger.info(
      `Received Feature control notification: ${name} (${valueType}), scopes: ${scopes}, updatedBy: ${updatedBy}`
    )
    if (scopes.some((scope) => scope === 'service.config-browser')) {
      if (name === AUTH_CONTROL_NAME) {
        switchAuth(message, logger)
      }
    } else {
      logger.info('Not a control of interest, ignoring')
    }
  } catch (err) {
    logger.error(err, 'Unable to process Input request:')
  }
}
