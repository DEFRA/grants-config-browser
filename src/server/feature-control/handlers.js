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

  const { featureControl, errorResponse } = await getFeatureControl(request.query.name, request, h)
  if (errorResponse) {
    return errorResponse
  }

  if (!canUserUpdate(request.auth.credentials?.roles, featureControl.roleRequired)) {
    return h.response('Forbidden').code(statusCodes.forbidden)
  }

  return renderUpdatePage(h, featureControl)
}

export const processUpdateHandler = async (request, h) => {
  const { name, note, action } = request.payload
  let { value: rawValue } = request.payload

  const { featureControl, errorResponse } = await getFeatureControl(name, request, h)
  if (errorResponse) {
    return errorResponse
  }

  if (!canUserUpdate(request.auth.credentials?.roles, featureControl.roleRequired)) {
    return h.response('Forbidden').code(statusCodes.forbidden)
  }

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
    errors.summary.push({ text: 'There was a problem communicating with the API. Please try again later.' })
    return renderUpdatePage(h, featureControl, errors, note, rawValue)
  }

  // success, redirect to the detail page
  return h.redirect(`/feature-control/detail?name=${name}`)
}

const getFeatureControl = async (name, request, h) => {
  const result = await requestFromApi(`feature-control/${name}/detailed`, request)
  const featureControl = result?.response

  if (!featureControl) {
    return { errorResponse: h.response(featureControlNotFound).code(statusCodes.notFound) }
  }

  return { featureControl }
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
    breadcrumbs: getBreadcrumbs(displayName, name, true),
    environment: formatEnvironment(config.get('cdpEnvironment'))
  })
}
