import { formatDateExplicit, formatDateTime, formatDateTimeExplicit } from '../helpers/date-display.js'
import { FEATURE_CONTROL_TYPES, TYPE_LABELS, DEFAULT_TYPE_LABEL, ENVIRONMENT_LABELS } from './constants.js'

export const getBreadcrumbs = (displayName, name, isUpdatePage = false) => {
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

export const buildHistoryTableHeaders = () => [
  { text: 'Date' },
  { text: 'Changed by' },
  { text: 'Value' },
  { text: 'Note' }
]

export const createHistoryRows = (history, type) =>
  (history || [])
    .sort((x, y) => (y.dateTime || '').localeCompare(x.dateTime || ''))
    .map((entry) => [
      { text: entry.dateTime ? formatDateTime(entry.dateTime) : '' },
      { text: entry.setBy },
      { text: formatValue(entry.value, type) },
      { text: entry.note }
    ])

export const handleListAction = (action, rawValue) => {
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
    const index = Number.parseInt(action.replace('remove-item-', ''), 10)
    items.splice(index, 1)
  }
  return items
}

export const formatAuditInfo = (featureControl) => {
  const { created, createdBy, lastUpdated, lastUpdatedBy, expiryDate } = featureControl
  return {
    expires: expiryDate ? formatDateExplicit(expiryDate) : '',
    created: created ? `${formatDateTimeExplicit(created)} by ${createdBy}` : '',
    updated: lastUpdated ? `${formatDateTimeExplicit(lastUpdated)} by ${lastUpdatedBy}` : ''
  }
}

export const formatValue = (value, type, isHtml = false) => {
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

export const formatScopes = (scopes) => (Array.isArray(scopes) && scopes.length > 0 ? wrapInList(scopes) : '')

export const formatRoles = (roles) =>
  Array.isArray(roles) && roles.length > 0 ? wrapInList(roles) : 'No role required'

export const canUserUpdate = (userRoles, roleRequired) => {
  if (!Array.isArray(roleRequired) || roleRequired.length === 0) {
    return true
  }
  if (!Array.isArray(userRoles)) {
    return false
  }
  return userRoles.some((role) => roleRequired.includes(role))
}

const wrapInList = (items) => `<ul class="govuk-list govuk-list--bullet">${items.map(mapValueToListItem).join('')}</ul>`
const mapValueToListItem = (value) => `<li>${value}</li>`

export const formatType = (type) => TYPE_LABELS[type] || DEFAULT_TYPE_LABEL

export const convertValueForType = (rawValue, type) => {
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

export const valueNotChanged = (newValue, currentValue) => {
  if (Array.isArray(newValue) && Array.isArray(currentValue)) {
    return newValue.length === currentValue.length && newValue.every((v, i) => v === currentValue[i])
  }
  return newValue === currentValue
}

export const formatEnvironment = (env) => ENVIRONMENT_LABELS[env] || 'UNKNOWN'
