import { visualiseCwController } from './controller.js'

/**
 * Sets up the routes used in the visualise cw page.
 * These routes are registered in src/server/router.js.
 */
export const visualiseCw = {
  plugin: {
    name: 'visualise-cw',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/visualise-cw',
          options: {
            auth: {
              mode: 'try'
            }
          },
          ...visualiseCwController
        }
      ])
    }
  }
}
