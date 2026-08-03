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

      const {
        displayName,
        value,
        type,
        scopes,
        roleRequired,
        expiryDate,
        created,
        createdBy,
        lastUpdated,
        lastUpdatedBy,
        history
      } = featureControl

      const historyRows = createHistoryRows(history, type)

      return h.view('feature-control/index', {
        pageTitle: `Feature control details - ${displayName}`,
        heading: displayName,
        technicalName: name,
        featureControl,
        formattedValue: formatValue(value, type, true),
        formattedScopes: formatScopes(scopes),
        formattedRoles: formatRoles(roleRequired),
        formattedType: formatType(type),
        expires: expiryDate ? formatDateExplicit(expiryDate) : '',
        created: created ? `${formatDateTimeExplicit(created)} by ${createdBy}` : '',
        updated: lastUpdated ? `${formatDateTimeExplicit(lastUpdated)} by ${lastUpdatedBy}` : '',
        historyRows,
        historyHeaders: buildHistoryTableHeaders(),
        breadcrumbs: [
          {
            text: 'Home',
            href: '/'
          },
          {
            text: 'Features',
            href: '/features'
          },
          {
            text: displayName
          }
        ],
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
      const { name, value: rawValue, note } = request.payload

      const { featureControl, errorResponse } = await getFeatureControl(name, request, h)
      if (errorResponse) {
        return errorResponse
      }

      const user = request.auth.credentials.displayName
      const value = convertValueForType(rawValue, featureControl.type)

      const errors = validateUpdate(value, featureControl.value, note)
      if (errors.summary.length > 0) {
        return renderUpdatePage(h, featureControl, errors, note, rawValue)
      }

      const result = await requestFromApi(`feature-control/value`, request, {}, 'PUT', { name, value, user, note })

      if (result?.status !== statusCodes.accepted) {
        errors.summary.push({ text: 'There was a problem communicating with the API. Please try again later.' })
        return renderUpdatePage(h, featureControl, errors, note, rawValue)
      }

      return h.redirect(`/feature-control/detail?name=${name}`)
    }
  }
}

const getFeatureControlSchema = Joi.object({
  name: Joi.string().required()
})

const getFeatureControl = async (name, request, h) => {
  const result = await requestFromApi(`feature-control/${name}/detailed`, request)
  const featureControl = result?.response

  if (!featureControl) {
    return { errorResponse: h.response(featureControlNotFound).code(statusCodes.notFound) }
  }

  return { featureControl }
}

const validateUpdate = (value, currentValue, note) => {
  const errors = { summary: [] }

  if (value === currentValue) {
    const errorMessage = 'The value must be different from the current value'
    errors.summary.push({ text: errorMessage, href: '#value' })
    errors.value = { text: errorMessage }
  }

  if (!note?.trim()) {
    const errorMessage = 'Enter a note to explain why this change is being made'
    errors.summary.push({ text: errorMessage, href: '#note' })
    errors.note = { text: errorMessage }
  }

  return errors
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
    breadcrumbs: [
      {
        text: 'Home',
        href: '/'
      },
      {
        text: 'Features',
        href: '/features'
      },
      {
        text: displayName,
        href: `/feature-control/detail?name=${name}`
      },
      {
        text: 'Update'
      }
    ]
  })
}

const featureControlNotFound = 'Feature control not found'

const TYPE_LABELS = {
  boolean: 'Toggle',
  number: 'Number',
  'list-string': 'Text list',
  'list-number': 'Number list'
}

const DEFAULT_TYPE_LABEL = 'Text'

const mapValueToListItem = (value) => `<li>${value}</li>`
const wrapInList = (items) => `<ul class="govuk-list govuk-list--bullet">${items.map(mapValueToListItem).join('')}</ul>`

const formatValue = (value, type, isHtml = false) => {
  if (type === 'list-string' || type === 'list-number') {
    if (Array.isArray(value)) {
      return isHtml ? wrapInList(value) : value.join(', ')
    }
    return value?.toString() ?? ''
  }

  if (type === 'boolean') {
    return value ? 'True' : 'False'
  }

  return value?.toString() ?? ''
}

const formatScopes = (scopes) => (Array.isArray(scopes) && scopes.length > 0 ? wrapInList(scopes) : '')

const formatRoles = (roles) => (Array.isArray(roles) && roles.length > 0 ? wrapInList(roles) : 'No role required')

const formatType = (type) => TYPE_LABELS[type] || DEFAULT_TYPE_LABEL

const convertValueForType = (rawValue, type) => {
  if (type === 'boolean') {
    return rawValue === 'true'
  }
  if (type === 'number') {
    return Number(rawValue)
  }
  if (type === 'list-string') {
    return rawValue.split(',').map((v) => v.trim())
  }
  if (type === 'list-number') {
    return rawValue.split(',').map((v) => Number(v.trim()))
  }
  return rawValue // must be string
}
