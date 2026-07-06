import { visualiseJourneyController } from './controller.js'

/**
 * Sets up the routes used in the visualise journey page.
 * These routes are registered in src/server/router.js.
 */
export const visualiseJourney = {
  plugin: {
    name: 'visualise-journey',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/visualise-journey',
          options: {
            auth: {
              mode: 'try'
            }
          },
          ...visualiseJourneyController
        }
      ])
    }
  }
}
