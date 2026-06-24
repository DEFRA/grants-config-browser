import { config } from '../../config/config.js'
import { WebIdentityTokenProvider, hapiAuthOidcPlugin, MockProvider } from '@defra/hapi-auth-oidc'

const { oidc, cookieOptions } = config.get('auth')

const scope = ['user.read'].join(' ') // add additional scopes required

const federatedCredentials = config.get('auth.federatedCredentials')

const authProvider = federatedCredentials.enableMocking
  ? new MockProvider({})
  : new WebIdentityTokenProvider({
      audience: federatedCredentials.audience
    })

export const authOidcPlugin = {
  plugin: hapiAuthOidcPlugin,
  options: {
    oidc: {
      ...oidc,
      scope,
      authProvider
    },
    cookieOptions
  }
}
