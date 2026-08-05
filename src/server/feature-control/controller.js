import { detailHandler, updateHandler, processUpdateHandler } from './handlers.js'

export const featureControlController = {
  detail: {
    handler: detailHandler
  },
  update: {
    handler: updateHandler
  },
  processUpdate: {
    handler: processUpdateHandler
  }
}
