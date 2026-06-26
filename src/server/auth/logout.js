import { config } from '../../config/config.js'
import { removeAuthenticatedUser } from './remove-authenticated-user.js'

export const signOutController = {
  method: 'GET',
  path: '/logout',
  options: {
    auth: {
      mode: 'try'
    }
  },
  handler: async (request, h) => {
    const userSession = request.auth.credentials

    if (!userSession) {
      return h.redirect('/')
    }
    const discoveryUri = config.get('auth.oidc.discoveryUri')

    const { end_session_endpoint: endSession } = await fetch(discoveryUri, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then((res) => res.json())

    const logoutBaseUrl = endSession
    const referrer = request.info.referrer
    const loginHint = userSession?.loginHint

    const logoutUrl = encodeURI(`${logoutBaseUrl}?logout_hint=${loginHint}&post_logout_redirect_uri=${referrer}`)

    removeAuthenticatedUser(request)

    return h.redirect(logoutUrl)
  }
}
