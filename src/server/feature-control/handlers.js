import { config } from '../../config/config.js'
import { requestFromApi } from '../helpers/request-from-api.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { FEATURE_CONTROL_TYPES, featureControlNotFound } from './constants.js'
import {
  getBreadcrumbs,
  buildHistoryTableHeaders,
  createHistoryRows,
  formatValue,
  formatScopes,
  formatRoles,
  formatType,
  formatAuditInfo,
  handleListAction,
  convertValueForType,
  formatEnvironment,
  canUserUpdate
} from './helpers.js'
import { getFeatureControlSchema, validateUpdate } from './validation.js'

export const detailHandler = async (request, h) => {
  const isAuthenticated = request?.auth?.credentials?.isAuthenticated ?? false

  if (getFeatureControlSchema.validate(request.query).error) {
    return h.redirect('/features')
  }

  const { name } = request.query

  const { featureControl, errorResponse } = await getFeatureControl(name, request, h)
  if (errorResponse) {
    return errorResponse
  }

  const { displayName, value, type, scopes, roleRequired, history } = featureControl
  const auditInfo = formatAuditInfo(featureControl)
  const canUpdate = isAuthenticated && canUserUpdate(request.auth.credentials?.roles, roleRequired)

  return h.view('feature-control/index', {
    pageTitle: `Feature control details - ${displayName}`,
    heading: displayName,
    technicalName: name,
    featureControl,
    formattedValue: formatValue(value, type, true),
    formattedScopes: formatScopes(scopes),
    formattedRoles: formatRoles(roleRequired),
    formattedType: formatType(type),
    ...auditInfo,
    historyRows: createHistoryRows(history, type),
    historyHeaders: buildHistoryTableHeaders(),
    breadcrumbs: getBreadcrumbs(displayName, name),
    isAuthenticated,
    canUpdate
  })
}

export const updateHandler = async (request, h) => {
  if (getFeatureControlSchema.validate(request.query).error) {
    return h.redirect('/features')
  }

  const { featureControl, errorResponse } = await getFeatureControlForUpdate(request.query.name, request, h, 'active')
  if (errorResponse) {
    return errorResponse
  }

  return renderUpdatePage(h, featureControl)
}

export const processUpdateHandler = async (request, h) => {
  const { name, note, action } = request.payload
  const { value: rawValue } = request.payload

  const { featureControl, errorResponse } = await getFeatureControlForUpdate(name, request, h, 'active')
  if (errorResponse) {
    return errorResponse
  }

  return processUpdate({ request, h, featureControl, action, rawValue, note, name })
}

export const withdrawHandler = async (request, h) => {
  return statusChangeHandler(request, h, 'active', renderWithdrawPage)
}

export const processWithdrawHandler = async (request, h) => {
  return processStatusChangeHandler(request, h, 'active', 'withdrawn', renderWithdrawPage)
}

export const reactivateHandler = async (request, h) => {
  return statusChangeHandler(request, h, 'withdrawn', renderReactivatePage)
}

export const processReactivateHandler = async (request, h) => {
  return processStatusChangeHandler(request, h, 'withdrawn', 'active', renderReactivatePage)
}

const getFeatureControl = async (name, request, h) => {
  const result = await requestFromApi(`feature-control/${name}/detailed`, request)
  const featureControl = result?.response

  if (!featureControl) {
    return { errorResponse: h.response(featureControlNotFound).code(statusCodes.notFound) }
  }

  return { featureControl }
}

const processUpdate = async ({ request, h, featureControl, action, rawValue, note, name }) => {
  if (action === 'add-item' || action?.startsWith('remove-item-')) {
    const items = handleListAction(action, rawValue)
    return renderUpdatePage(h, featureControl, null, note, items)
  }

  const user = request.auth.credentials.displayName

  if (
    (featureControl.type === FEATURE_CONTROL_TYPES.LIST_STRING ||
      featureControl.type === FEATURE_CONTROL_TYPES.LIST_NUMBER) &&
    !Array.isArray(rawValue)
  ) {
    rawValue = rawValue !== undefined ? [rawValue] : []
  }

  const errors = validateUpdate(rawValue, featureControl.value, note, featureControl.type)
  if (errors.summary.length > 0) {
    return renderUpdatePage(h, featureControl, errors, note, rawValue)
  }

  const value = convertValueForType(rawValue, featureControl.type)

  const result = await requestFromApi(`feature-control/value`, request, {}, 'PUT', { name, value, user, note })

  if (result?.status !== statusCodes.accepted) {
    errors.summary.push({ text: apiCommsErrorMessage })
    return renderUpdatePage(h, featureControl, errors, note, rawValue)
  }

  // success, redirect to the detail page
  return h.redirect(`/feature-control/detail?name=${name}`)
}

const renderUpdatePage = (h, featureControl, errors = null, note = '', submittedValue = null) => {
  const { name, displayName } = featureControl

  return h.view('feature-control/update', {
    pageTitle: (errors ? 'Error: ' : '') + `Update feature control - ${displayName}`,
    heading: `Update ${displayName}`,
    technicalName: name,
    featureControl,
    errors,
    note,
    submittedValue,
    breadcrumbs: getBreadcrumbs(displayName, name, 'update'),
    environment: formatEnvironment(config.get('cdpEnvironment'))
  })
}

const renderWithdrawPage = (h, featureControl, errors = null, note = '') => {
  const { name, displayName } = featureControl

  return h.view('feature-control/withdraw', {
    pageTitle: (errors ? 'Error: ' : '') + `Withdraw feature control - ${displayName}`,
    heading: `Withdraw ${displayName}`,
    technicalName: name,
    featureControl,
    errors,
    note,
    breadcrumbs: getBreadcrumbs(displayName, name, 'withdraw'),
    environment: formatEnvironment(config.get('cdpEnvironment'))
  })
}

const renderReactivatePage = (h, featureControl, errors = null, note = '') => {
  const { name, displayName } = featureControl

  return h.view('feature-control/reactivate', {
    pageTitle: (errors ? 'Error: ' : '') + `Reactivate feature control - ${displayName}`,
    heading: `Reactivate ${displayName}`,
    technicalName: name,
    featureControl,
    errors,
    note,
    breadcrumbs: getBreadcrumbs(displayName, name, 'reactivate'),
    environment: formatEnvironment(config.get('cdpEnvironment'))
  })
}

const getFeatureControlForUpdate = async (name, request, h, requiredStatus) => {
  const { featureControl, errorResponse } = await getFeatureControl(name, request, h)
  if (errorResponse) {
    return { errorResponse }
  }

  if (!canUserUpdate(request.auth.credentials?.roles, featureControl.roleRequired)) {
    return { errorResponse: h.response('Forbidden').code(statusCodes.forbidden) }
  }

  if (featureControl.status !== requiredStatus) {
    const isUpdate = requiredStatus === 'active' && !request.path.includes('withdraw')
    if (isUpdate) {
      return { errorResponse: h.response('Forbidden').code(statusCodes.forbidden) }
    }
    return { errorResponse: h.redirect(`/feature-control/detail?name=${featureControl.name}`) }
  }

  return { featureControl }
}

const statusChangeHandler = async (request, h, requiredStatus, renderPage) => {
  if (getFeatureControlSchema.validate(request.query).error) {
    return h.redirect('/features')
  }

  const { featureControl, errorResponse } = await getFeatureControlForUpdate(
    request.query.name,
    request,
    h,
    requiredStatus
  )
  if (errorResponse) {
    return errorResponse
  }

  return renderPage(h, featureControl)
}

const processStatusChangeHandler = async (request, h, requiredStatus, newStatus, renderPage) => {
  const { name, note } = request.payload

  const { featureControl, errorResponse } = await getFeatureControlForUpdate(name, request, h, requiredStatus)
  if (errorResponse) {
    return errorResponse
  }

  const user = request.auth.credentials.displayName
  const errors = { summary: [] }

  if (!note?.trim()) {
    const action = newStatus === 'withdrawn' ? 'withdrawn' : 'reactivated'
    const errorMessage = `Enter a note to explain why this feature control is being ${action}`
    errors.summary.push({ text: errorMessage, href: '#note' })
    errors.note = { text: errorMessage }
  }

  if (errors.summary.length > 0) {
    return renderPage(h, featureControl, errors, note)
  }

  const result = await requestFromApi('feature-control/status', request, {}, 'PUT', {
    name,
    status: newStatus,
    user,
    note
  })

  if (result?.status !== statusCodes.accepted) {
    errors.summary.push({ text: apiCommsErrorMessage })
    return renderPage(h, featureControl, errors, note)
  }

  return h.redirect(`/feature-control/detail?name=${name}`)
}

const apiCommsErrorMessage = 'There was a problem communicating with the API. Please try again later.'
