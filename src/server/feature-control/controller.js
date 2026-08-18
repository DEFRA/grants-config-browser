import {
  detailHandler,
  updateHandler,
  processUpdateHandler,
  withdrawHandler,
  processWithdrawHandler
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
  }
}
