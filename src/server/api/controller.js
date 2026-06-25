import { requestFromApi } from '../helpers/request-from-api.js'
import { statusCodes } from '../common/constants/status-codes.js'

export const apiController = {
  options: {
    auth: false
  },
  async handler(request, h) {
    const { method, url, payload } = request
    const path = url.pathname.replaceAll('/api/', '').concat(url.search)

    try {
      const result = await requestFromApi(path, request, {}, method, payload)

      return h.response(result.response).code(result.status)
    } catch (err) {
      request.logger.error(err, `Error proxying request to ${path}`)
      return h.response({ error: 'Internal Server Error' }).code(statusCodes.internalServerError)
    }
  }
}
