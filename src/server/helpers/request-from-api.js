import { config } from '../../config/config.js'
import { createApiHeadersForConfigBroker } from './broker-auth-helper.js'

const GRANTS_CONFIG_BROKER_ENDPOINT = config.get('backend.apiEndpoint')

export async function requestFromApi(endpoint, request) {
  console.log(`Calling ${endpoint}`)
  if (!GRANTS_CONFIG_BROKER_ENDPOINT?.length) {
    return
  }

  const url = new URL(`/api/${endpoint}`, GRANTS_CONFIG_BROKER_ENDPOINT)
  console.log(`Calling ${url.href}`)
  try {
    const response = await fetch(url.href, {
      method: 'GET',
      headers: createApiHeadersForConfigBroker()
    })

    if (!response.ok) {
      request.logger.error({})
    }
    return response.json()
  } catch (err) {
    request.logger.error({})
  }
}
