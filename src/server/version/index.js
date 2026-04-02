import { versionController } from './controller.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */
export const version = {
  plugin: {
    name: 'version',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/version',
          ...versionController
        }
      ])
    }
  }
}
