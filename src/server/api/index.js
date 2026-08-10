import { apiController } from './controller.js'

export const api = {
  plugin: {
    name: 'api',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/api/latestVersion',
          ...apiController
        },
        {
          method: 'GET',
          path: '/api/version',
          ...apiController
        },
        {
          method: 'GET',
          path: '/api/allVersions',
          ...apiController
        },
        {
          method: 'GET',
          path: '/api/allGrants',
          ...apiController
        },
        {
          method: 'GET',
          path: '/api/versionHistory',
          ...apiController
        },
        {
          method: 'POST',
          path: '/api/release-config',
          ...apiController
        },
        {
          method: 'GET',
          path: '/api/feature-control/{name}',
          ...apiController
        },
        {
          method: 'GET',
          path: '/api/feature-control/{name}/detailed',
          ...apiController
        },
        {
          method: 'POST',
          path: '/api/feature-control',
          ...apiController
        },
        {
          method: 'PUT',
          path: '/api/feature-control/value',
          ...apiController
        },
        {
          method: 'GET',
          path: '/api/feature-controls',
          ...apiController
        }
      ])
    }
  }
}
