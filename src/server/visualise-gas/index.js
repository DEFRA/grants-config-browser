import { visualiseGasController } from './controller.js'

/**
 * Sets up the routes used in the visualise gas page.
 * These routes are registered in src/server/router.js.
 */
export const visualiseGas = {
  plugin: {
    name: 'visualise-gas',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/visualise-gas',
          options: {
            auth: {
              mode: 'try'
            }
          },
          ...visualiseGasController
        }
      ])
    }
  }
}
