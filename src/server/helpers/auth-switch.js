import { config } from '../../config/config.js'
import { requestFromApi } from './request-from-api.js'
import { AUTH_CONTROL_NAME } from '../common/constants/constants.js'

export function switchAuth(serviceAuthEnabled, logger) {
  if (serviceAuthEnabled) {
    logger.info('Service Auth enabled')
    config.set('backend.serviceAuth.enabled', true)
    config.set('backend.legacyAuth.enabled', false)
  } else {
    logger.info('Service Auth disabled')
    config.set('backend.serviceAuth.enabled', false)
    config.set('backend.legacyAuth.enabled', true)
  }
}

export async function retrieveAndSetInitialAuthOption(server) {
  // This will retrieve the initial option from the config-broker and set it in the config
  // Due to the nature of this exact value/control it is a strange one, because we will be
  // using the 'default' auth setting within the app, in order to call the API using it,
  // to pick up the external auth setting to use by default. This is only a temporary solution
  // until we can remove the legacy auth completely anyway, and in the meantime, is a good
  // way to demo the feature control.
  if (config.get('backend.serviceAuth.checkOnStartup')) {
    const result = await requestFromApi(`feature-control/${AUTH_CONTROL_NAME}`, server)
    if (result) {
      const { value } = result.response
      switchAuth(value, server.logger)
    }
  }
}
