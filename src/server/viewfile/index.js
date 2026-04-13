import { viewFileController } from './controller.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */
export const viewfile = {
  plugin: {
    name: 'viewfile',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/viewfile',
          ...viewFileController
        }
      ])
    }
  }
}
