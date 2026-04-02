import { grantController } from './controller.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */
export const grant = {
  plugin: {
    name: 'grant',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/grant',
          ...grantController
        }
      ])
    }
  }
}
