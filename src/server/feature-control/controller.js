import { requestFromApi } from '../helpers/request-from-api.js'
import { formatDateExplicit, formatDateTime, formatDateTimeExplicit } from '../helpers/date-display.js'
import Joi from 'joi'
import { statusCodes } from '../common/constants/status-codes.js'

export const featureControlController = {
  detail: {
    async handler(request, h) {
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
        isAuthenticated
      })
    }
  },
  update: {
    async handler(request, h) {
      if (getFeatureControlSchema.validate(request.query).error) {
        return h.redirect('/features')
      }

      const { featureControl, errorResponse } = await getFeatureControl(request.query.name, request, h)
      if (errorResponse) {
        return errorResponse
      }

      return renderUpdatePage(h, featureControl)
    }
  },
  processUpdate: {
    async handler(request, h) {
      const { name, note, action } = request.payload
      let { value: rawValue } = request.payload

      const { featureControl, errorResponse } = await getFeatureControl(name, request, h)
      if (errorResponse) {
        return errorResponse
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
  }
}

const getFeatureControlSchema = Joi.object({
  name: Joi.string().required()
})

const featureControlNotFound = 'Feature control not found'

const getFeatureControl = async (name, request, h) => {
  const result = await requestFromApi(`feature-control/${name}/detailed`, request)
  const featureControl = result?.response

  if (!featureControl) {
    return { errorResponse: h.response(featureControlNotFound).code(statusCodes.notFound) }
  }

  return { featureControl }
}

const buildHistoryTableHeaders = () => [{ text: 'Date' }, { text: 'Changed by' }, { text: 'Value' }, { text: 'Note' }]

const createHistoryRows = (history, type) =>
  (history || [])
    .sort((x, y) => (y.dateTime || '').localeCompare(x.dateTime || ''))
    .map((entry) => [
      { text: entry.dateTime ? formatDateTime(entry.dateTime) : '' },
      { text: entry.setBy },
      { text: formatValue(entry.value, type) },
      { text: entry.note }
    ])

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
    breadcrumbs: getBreadcrumbs(displayName, name, true)
  })
}

const FEATURE_CONTROL_TYPES = {
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  STRING: 'string',
  LIST_STRING: 'list-string',
  LIST_NUMBER: 'list-number'
}

const TYPE_LABELS = {
  [FEATURE_CONTROL_TYPES.BOOLEAN]: 'Toggle',
  [FEATURE_CONTROL_TYPES.NUMBER]: 'Number',
  [FEATURE_CONTROL_TYPES.LIST_STRING]: 'Text list',
  [FEATURE_CONTROL_TYPES.LIST_NUMBER]: 'Number list'
}

const handleListAction = (action, rawValue) => {
  let items
  if (Array.isArray(rawValue)) {
    items = rawValue
  } else if (rawValue !== undefined) {
    items = [rawValue]
  } else {
    items = []
  }

  if (action === 'add-item') {
    items.push('')
  } else {
    const index = parseInt(action.replace('remove-item-', ''), 10)
    items.splice(index, 1)
  }
  return items
}

const formatAuditInfo = (featureControl) => {
  const { created, createdBy, lastUpdated, lastUpdatedBy, expiryDate } = featureControl
  return {
    expires: expiryDate ? formatDateExplicit(expiryDate) : '',
    created: created ? `${formatDateTimeExplicit(created)} by ${createdBy}` : '',
    updated: lastUpdated ? `${formatDateTimeExplicit(lastUpdated)} by ${lastUpdatedBy}` : ''
  }
}

const addError = (errors, field, message) => {
  errors.summary.push({ text: message, href: `#${field}` })
  errors[field] = { text: message }
}

const isValidNumber = (val) => typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))

const isNonEmptyString = (val) => typeof val === 'string' && val.trim() !== ''

const validateListType = (errors, rawValue, type) => {
  const rawItems = Array.isArray(rawValue) ? rawValue : [rawValue]
  const filteredItems = rawItems.map((v) => (typeof v === 'string' ? v.trim() : '')).filter((v) => v !== '')

  if (filteredItems.length === 0) {
    addError(errors, 'value', 'Enter at least one item')
  } else if (rawItems.some((v) => !isNonEmptyString(v))) {
    const errorMessage =
      type === FEATURE_CONTROL_TYPES.LIST_NUMBER ? 'Enter a valid list of numbers' : 'Enter a valid list of items'
    addError(errors, 'value', errorMessage)
  } else if (type === FEATURE_CONTROL_TYPES.LIST_NUMBER && rawItems.some((v) => !isValidNumber(v))) {
    addError(errors, 'value', 'Enter a valid list of numbers')
  }
}

const validateUpdate = (rawValue, currentValue, note, type) => {
  const errors = { summary: [] }

  if (type === FEATURE_CONTROL_TYPES.STRING && !isNonEmptyString(rawValue)) {
    addError(errors, 'value', 'Enter a valid value')
  }

  if (type === FEATURE_CONTROL_TYPES.NUMBER && !isValidNumber(rawValue)) {
    addError(errors, 'value', 'Enter a valid number')
  }

  if (type === FEATURE_CONTROL_TYPES.LIST_NUMBER || type === FEATURE_CONTROL_TYPES.LIST_STRING) {
    validateListType(errors, rawValue, type)
  }

  if (errors.summary.length === 0) {
    const value = convertValueForType(rawValue, type)
    if (valueNotChanged(value, currentValue)) {
      addError(errors, 'value', 'The value must be different from the current value')
    }
  }

  if (!note?.trim()) {
    addError(errors, 'note', 'Enter a note to explain why this change is being made')
  }

  return errors
}

const getBreadcrumbs = (displayName, name, isUpdatePage = false) => {
  const breadcrumbs = [
    { text: 'Home', href: '/' },
    { text: 'Features', href: '/features' }
  ]

  if (isUpdatePage) {
    breadcrumbs.push({ text: displayName, href: `/feature-control/detail?name=${name}` }, { text: 'Update' })
  } else {
    breadcrumbs.push({ text: displayName })
  }

  return breadcrumbs
}

const DEFAULT_TYPE_LABEL = 'Text'

const mapValueToListItem = (value) => `<li>${value}</li>`
const wrapInList = (items) => `<ul class="govuk-list govuk-list--bullet">${items.map(mapValueToListItem).join('')}</ul>`

const formatValue = (value, type, isHtml = false) => {
  if (type === FEATURE_CONTROL_TYPES.LIST_STRING || type === FEATURE_CONTROL_TYPES.LIST_NUMBER) {
    if (Array.isArray(value)) {
      return isHtml ? wrapInList(value) : value.join(', ')
    }
    return value?.toString() ?? ''
  }

  if (type === FEATURE_CONTROL_TYPES.BOOLEAN) {
    return value ? 'True' : 'False'
  }

  return value?.toString() ?? ''
}

const formatScopes = (scopes) => (Array.isArray(scopes) && scopes.length > 0 ? wrapInList(scopes) : '')

const formatRoles = (roles) => (Array.isArray(roles) && roles.length > 0 ? wrapInList(roles) : 'No role required')

const formatType = (type) => TYPE_LABELS[type] || DEFAULT_TYPE_LABEL

const convertValueForType = (rawValue, type) => {
  if (type === FEATURE_CONTROL_TYPES.BOOLEAN) {
    return rawValue === 'true'
  }
  if (type === FEATURE_CONTROL_TYPES.NUMBER) {
    return Number(rawValue)
  }
  const rawItems = Array.isArray(rawValue) ? rawValue : [rawValue]
  if (type === FEATURE_CONTROL_TYPES.LIST_STRING) {
    return rawItems.map((v) => (typeof v === 'string' ? v.trim() : ''))
  }
  if (type === FEATURE_CONTROL_TYPES.LIST_NUMBER) {
    return rawItems.map((v) => (typeof v === 'string' ? v.trim() : '')).map(Number)
  }
  return rawValue // must be string
}

const valueNotChanged = (newValue, currentValue) => {
  if (Array.isArray(newValue) && Array.isArray(currentValue)) {
    return newValue.length === currentValue.length && newValue.every((v, i) => v === currentValue[i])
  }
  return newValue === currentValue
}
