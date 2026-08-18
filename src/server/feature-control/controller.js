import {
  detailHandler,
  updateHandler,
  processUpdateHandler,
  withdrawHandler,
  processWithdrawHandler,
  reactivateHandler,
  processReactivateHandler
} from './handlers.js'

export const featureControlController = {
  detail: {
    handler: detailHandler
  },
  update: {
    handler: updateHandler
  },
  processUpdate: {
    handler: processUpdateHandler
  },
  withdraw: {
    handler: withdrawHandler
  },
  processWithdraw: {
    handler: processWithdrawHandler
  },
  reactivate: {
    handler: reactivateHandler
  },
  processReactivate: {
    handler: processReactivateHandler
  }
}
