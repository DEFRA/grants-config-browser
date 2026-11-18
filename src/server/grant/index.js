import {
  grantController,
  archiveVersionHandler,
  unarchiveVersionHandler,
  confirmArchiveHandler,
  confirmUnarchiveHandler
} from './controller.js'

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
          options: {
            auth: {
              mode: 'try'
            }
          },
          ...grantController
        },
        {
          method: 'GET',
          path: '/version/archive',
          options: {
            auth: {
              mode: 'try'
            }
          },
          handler: confirmArchiveHandler
        },
        {
          method: 'GET',
          path: '/version/unarchive',
          options: {
            auth: {
              mode: 'try'
            }
          },
          handler: confirmUnarchiveHandler
        },
        {
          method: 'POST',
          path: '/version/archive',
          handler: archiveVersionHandler
        },
        {
          method: 'POST',
          path: '/version/unarchive',
          handler: unarchiveVersionHandler
        }
      ])
    }
  }
}
