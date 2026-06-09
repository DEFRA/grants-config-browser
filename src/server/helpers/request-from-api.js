import { config } from '../../config/config.js'
import { createApiHeadersForConfigBroker } from './broker-auth-helper.js'

export async function requestFromApi(endpoint, request, otherHeaders = {}, method = 'GET', payload = null) {
  const GRANTS_CONFIG_BROKER_ENDPOINT = config.get('backend.apiEndpoint')
  if (!GRANTS_CONFIG_BROKER_ENDPOINT?.length) {
    return null
  }

  const url = new URL(`/api/${endpoint}`, GRANTS_CONFIG_BROKER_ENDPOINT)
  try {
    let possibleBody
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && payload) {
      possibleBody = JSON.stringify(payload)
    }

    const response = await fetch(url.href, {
      method,
      headers: { ...createApiHeadersForConfigBroker(), ...otherHeaders },
      ...(possibleBody && { body: possibleBody })
    })

    if (!response.ok) {
      request.logger.error({})
    }
    return { response: await response.json(), status: response.status }
  } catch (err) {
    request.logger.error({})
    return null
  }
}
