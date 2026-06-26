import { saveUserSession } from './save-user-session.js'
import Boom from '@hapi/boom'

const handler = async (request, h) => {
  request.logger.info(`Auth callback payload: ${JSON.stringify(request.payload)}`)
  request.logger.info(`Auth callback query: ${JSON.stringify(request.query)}`)
  request.logger.info(`Auth callback headers: ${JSON.stringify(request.headers)}`)
  request.logger.info(`Auth callback status: ${request.status}`)

  const credentials = await request.callback(h)

  if (!credentials) {
    throw Boom.unauthorized()
  }
  const { sessionCookie } = request
  const sessionId = crypto.randomUUID()

  await saveUserSession(request, sessionId, credentials)

  sessionCookie.set({ sessionId })

  request.auth.credentials = credentials

  return h.response(`<html><head><meta http-equiv="refresh" content="0;URL='/'"></head><body></body></html>`).takeover()
}

const authPostCallbackController = {
  method: 'POST',
  path: '/auth',
  options: {
    auth: false,
    plugins: {
      crumb: false
    },
    payload: {
      parse: true,
      allow: 'application/x-www-form-urlencoded'
    }
  },
  handler
}
const authGetCallbackController = {
  method: 'GET',
  path: '/auth',
  options: {
    auth: false
  },
  handler
}

export const authCallbacks = [authPostCallbackController, authGetCallbackController]
