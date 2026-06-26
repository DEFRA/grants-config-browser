import { notificationsController } from './controller.js'

export const notifications = {
  plugin: {
    name: 'notifications',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/notifications',
          options: {
            auth: {
              mode: 'try'
            }
          },
          ...notificationsController
        }
      ])
    }
  }
}
