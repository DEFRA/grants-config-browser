import { SignJWT } from 'jose'

const ISSUER = 'http://localhost:3000'
const CLIENT_ID = '2eb3a9da-aea0-4013-ac30-83df00bda6dd'
// A dummy key for HS256 if we need to sign
const DUMMY_KEY = new TextEncoder().encode('this-is-a-very-secret-key-used-for-mocking-only')

export const mockDiscoveryHandler = {
  method: 'GET',
  path: '/.well-known/openid-configuration',
  options: {
    auth: false
  },
  handler: (request, h) => {
    const baseUrl = `http://localhost:${request.server.info.port}`
    const response = {
      issuer: ISSUER,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      jwks_uri: `${baseUrl}/.well-known/jwks.json`,
      userinfo_endpoint: `${baseUrl}/userinfo`,
      end_session_endpoint: `${baseUrl}/endSession`,
      response_types_supported: [
        'code',
        'id_token',
        'token id_token',
        'code id_token',
        'code token',
        'code id_token token',
        'none'
      ],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['HS256'],
      scopes_supported: ['openid', 'profile', 'email'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'name', 'email', 'nonce', 'auth_time']
    }
    request.logger.info(`[MockDiscovery] Returning: ${JSON.stringify(response, null, 2)}`)
    return h.response(response).type('application/json')
  }
}

export const mockAuthorizeHandler = {
  method: 'GET',
  path: '/authorize',
  options: {
    auth: {
      mode: 'try'
    }
  },
  handler: (request, h) => {
    request.logger.info(`[MockAuthorize] Request Query: ${JSON.stringify(request.query)}`)
    // eslint-disable-next-line camelcase
    const { redirect_uri, state, nonce } = request.query
    const callbackUrl = new URL(redirect_uri)
    // Encode nonce into code to retrieve it in /token
    const code = nonce ? `mock-code:${nonce}` : 'mock-code'
    callbackUrl.searchParams.set('code', code)
    callbackUrl.searchParams.set('state', state)
    request.logger.info(`[MockAuthorize] Redirecting to: ${callbackUrl.toString()}`)
    return h.redirect(callbackUrl.toString())
  }
}

export const mockTokenHandler = {
  method: 'POST',
  path: '/token',
  options: {
    auth: {
      mode: 'try'
    }
  },
  handler: async (request, h) => {
    request.logger.info(`[MockToken] Request Payload: ${JSON.stringify(request.payload)}`)
    const { code } = request.payload
    let nonce
    if (code && code.startsWith('mock-code:')) {
      nonce = code.split(':')[1]
    }

    const now = Math.floor(Date.now() / 1000)
    const idTokenClaims = {
      sub: 'mock-user-id',
      oid: 'mock-user-oid',
      name: 'Mock User',
      email: 'mock@example.com',
      iat: now,
      exp: now + 3600,
      iss: ISSUER,
      aud: CLIENT_ID,
      auth_time: now
    }

    if (nonce) {
      idTokenClaims.nonce = nonce
    }

    // oauth4webapi is very strict. If it sees id_token, it validates it.
    // If it's not signed, it might fail unless 'none' is explicitly handled.
    // Let's ALWAYS sign it with HS256 for the mock to be safe.
    const idToken = await new SignJWT(idTokenClaims).setProtectedHeader({ alg: 'HS256' }).sign(DUMMY_KEY)

    // Also return valid JWTs for access_token and refresh_token to satisfy @hapi/jwt validation
    const accessToken = await new SignJWT({ ...idTokenClaims, typ: 'AccessToken' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(DUMMY_KEY)

    const refreshToken = await new SignJWT({ sub: idTokenClaims.sub, typ: 'RefreshToken' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(DUMMY_KEY)

    const response = {
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid profile email',
      refresh_token: refreshToken
    }
    request.logger.info(`[MockToken] Returning: ${JSON.stringify(response, null, 2)}`)
    return h.response(response)
  }
}

export const mockUserInfoHandler = {
  method: 'GET',
  path: '/userinfo',
  options: {
    auth: {
      mode: 'try'
    }
  },
  handler: (request, h) => {
    return h.response({
      sub: 'mock-user-id',
      name: 'Mock User',
      email: 'mock@example.com'
    })
  }
}

export const mockJwksHandler = {
  method: 'GET',
  path: '/.well-known/jwks.json',
  options: {
    auth: {
      mode: 'try'
    }
  },
  handler: (request, h) => {
    return h.response({
      keys: []
    })
  }
}

export const mockEndSessionHandler = {
  method: 'GET',
  path: '/endSession',
  options: {
    auth: {
      mode: 'try'
    }
  },
  handler: (request, h) => {
    request.logger.info(`[MockEndSession] Request Query: ${JSON.stringify(request.query)}`)
    return h.redirect('/')
  }
}
