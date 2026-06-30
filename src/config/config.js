import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import convictFormatWithValidator from 'convict-format-with-validator'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const fourHoursMs = 14400000
const oneWeekMs = 604800000

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'

convict.addFormats(convictFormatWithValidator)

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeekMs,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'grants-config-browser'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res.headers']
    }
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  auth: {
    token: {
      doc: 'Bearer token for service-to-service authentication',
      format: String,
      default: '',
      env: 'GRANTS_CONFIG_BROKER_AUTH_TOKEN',
      sensitive: true
    },
    encryptionKey: {
      doc: 'Encryption key for decrypting bearer token',
      format: String,
      default: '',
      env: 'GRANTS_CONFIG_BROKER_ENCRYPTION_KEY',
      sensitive: true
    },
    federatedCredentials: {
      enableMocking: {
        doc: 'Enable mocking of federated credentials',
        format: Boolean,
        default: false,
        env: 'FEDERATED_CREDENTIALS_ENABLE_MOCKING'
      },
      audience: {
        doc: 'Audience for federated credentials',
        format: Array,
        default: ['grants_config_browser'],
        env: 'FEDERATED_CREDENTIALS_AUDIENCE'
      }
    },
    oidc: {
      clientId: {
        doc: 'Client ID for OpenID Connect',
        format: String,
        default: '2eb3a9da-aea0-4013-ac30-83df00bda6dd',
        env: 'OIDC_CLIENT_ID'
      },
      discoveryUri: {
        doc: 'Discovery URI for OpenID Connect',
        format: String,
        default: isProduction
          ? 'https://login.microsoftonline.com/6f504113-6b64-43f2-ade9-242e05780007/v2.0/.well-known/openid-configuration'
          : 'http://localhost:3000/.well-known/openid-configuration',
        env: 'OIDC_DISCOVERY_URI'
      },
      useHttp: {
        doc: 'Use HTTP for OpenID Connect',
        format: Boolean,
        default: !isProduction,
        env: 'OIDC_USE_HTTP'
      },
      loginCallbackUri: {
        doc: 'Login callback URI for OpenID Connect',
        format: String,
        default: '/auth',
        env: 'OIDC_LOGIN_CALLBACK_URI'
      },
      externalBaseUrl: {
        doc: 'External base URL for OpenID Connect',
        format: String,
        default: 'http://localhost:3000',
        env: 'APP_BASE_URL'
      },
      responseMode: {
        doc: 'Response mode for OpenID Connect',
        format: String,
        default: isProduction ? 'form_post' : 'query',
        env: 'OIDC_RESPONSE_MODE'
      }
    },
    cookieOptions: {
      password: {
        doc: 'Password for cookie',
        format: String,
        default: 'cookiescookiesilovecookiesyumyumcookies',
        env: 'COOKIE_PASSWORD',
        sensitive: true
      },
      isSecure: {
        doc: 'isSecure setting for cookie',
        format: Boolean,
        default: isProduction,
        env: 'COOKIE_IS_SECURE'
      },
      isSameSite: {
        doc: 'isSameSite setting for cookie',
        format: String,
        default: isProduction ? 'None' : 'Lax',
        env: 'COOKIE_IS_SAME_SITE'
      }
    }
  },
  backend: {
    apiEndpoint: {
      doc: 'Endpoint for the backend API',
      format: String,
      default: 'http://localhost:3001',
      env: 'GRANTS_CONFIG_BROKER_API_ENDPOINT'
    }
  },
  session: {
    cache: {
      engine: {
        doc: 'backend cache is written to',
        format: ['redis', 'memory'],
        default: isProduction ? 'redis' : 'memory',
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'server side session cache name',
        format: String,
        default: 'session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'server side session cache ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_CACHE_TTL'
      },
      segment: {
        doc: 'Isolate cached items within the cache partition',
        format: String,
        default: 'session',
        env: 'SERVER_CACHE_SEGMENT'
      }
    },
    cookie: {
      ttl: {
        doc: 'Session cookie ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'session cookie password',
        format: String,
        default: 'the-password-must-be-at-least-32-characters-long',
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      },
      secure: {
        doc: 'set secure flag on cookie',
        format: Boolean,
        default: isProduction,
        env: 'SESSION_COOKIE_SECURE'
      }
    }
  },
  aws: {
    endpointUrl: {
      doc: 'AWS Endpoint URL used for LocalStack',
      format: String,
      nullable: true,
      default: null,
      env: 'AWS_ENDPOINT_URL'
    },
    region: {
      doc: 'AWS Region',
      format: String,
      default: 'eu-west-2',
      env: 'AWS_REGION'
    },
    s3: {
      forcePathStyle: {
        doc: 'Force path style on S3 bucket',
        format: Boolean,
        default: true,
        env: 'FORCE_PATH_STYLE'
      }
    },
    sqs: {
      newConfigQueueUrl: {
        doc: 'URL of the SQS queue to receive new config notification requests from',
        format: String,
        default: '#',
        env: 'CONFIG_VERSION_QUEUE_URL'
      }
    }
  },
  redis: {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'grants-config-browser:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster.',
      format: Boolean,
      default: !isProduction,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: isProduction,
      env: 'REDIS_TLS'
    }
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  visualiseJourney: {
    yamlPath: {
      doc: 'Path to the journey YAML file',
      format: String,
      default: path.resolve(dirname, '../../woodland.yaml'),
      env: 'VISUALISE_JOURNEY_YAML_PATH'
    }
  }
})

config.validate({ allowed: 'strict' })
