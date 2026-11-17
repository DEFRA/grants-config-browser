import { config } from '../../config/config.js'
import { createApiHeadersForConfigBroker } from './broker-auth-helper.js'

function extractErrorMessage(errorText) {
  try {
    return JSON.parse(errorText).error
  } catch {
    return errorText
  }
}

export async function requestFromApi(
  endpoint,
  request,
  otherHeaders = {},
  method = 'GET',
  payload = null,
  returnError = false
) {
  const GRANTS_CONFIG_BROKER_ENDPOINT = config.get('backend.apiEndpoint')
  if (!GRANTS_CONFIG_BROKER_ENDPOINT?.length) {
    return null
  }

  const url = new URL(`/api/${endpoint}`, GRANTS_CONFIG_BROKER_ENDPOINT)
  try {
    const configBrokerApiHeaders = await createApiHeadersForConfigBroker(request)
    let possibleBody
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && payload) {
      possibleBody = JSON.stringify(payload)
    }

    const response = await fetch(url.href, {
      method,
      headers: { ...configBrokerApiHeaders, ...otherHeaders },
      ...(possibleBody && { body: possibleBody })
    })

    if (!response.ok) {
      const failure = new Error(`API request to ${url.href} failed with status ${response.status}`)
      if (returnError) {
        request.logger.error(failure, 'Error fetching data from API:')
        const errorText = await response.text()
        return {
          status: response.status,
          href: url.href,
          error: errorText ? extractErrorMessage(errorText) : undefined
        }
      }
      throw failure
    }

    const text = await response.text()
    return {
      response: text ? JSON.parse(text) : null,
      status: response.status
    }
  } catch (err) {
    request.logger.error(err, 'Error fetching data from API:')
    return null
  }
}
