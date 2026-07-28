import { requestFromApi } from '../helpers/request-from-api.js'
import { formatDateExplicit, formatDateTime, formatDateTimeExplicit } from '../helpers/date-display.js'
import Joi from 'joi'

const getFeatureControlSchema = Joi.object({
  name: Joi.string().required()
})

const buildHistoryTableHeaders = () => {
  return [
    {
      text: 'Value'
    },
    {
      text: 'Updated at'
    },
    {
      text: 'Note'
    },
    {
      text: 'Updated by'
    }
  ]
}

const formatValue = (value, type, isHtml = false) => {
  if (type === 'list-string' || type === 'list-number') {
    if (Array.isArray(value)) {
      if (isHtml) {
        return `<ul class="govuk-list govuk-list--bullet">${value.map((v) => `<li>${v}</li>`).join('')}</ul>`
      }
      return value.join(', ')
    }
    return value?.toString() ?? ''
  }
  if (type === 'boolean') {
    return value ? 'True' : 'False'
  }
  return value?.toString() ?? ''
}

const formatScopes = (scopes) => {
  if (!scopes || !Array.isArray(scopes)) {
    return ''
  }
  return `<ul class="govuk-list govuk-list--bullet">${scopes.map((v) => `<li>${v}</li>`).join('')}</ul>`
}

const formatRoles = (roles) => {
  if (!roles || !Array.isArray(roles)) {
    return 'No role required'
  }
  return `One of:<ul class="govuk-list govuk-list--bullet">${roles.map((v) => `<li>${v}</li>`).join('')}</ul>`
}

const createHistoryRows = (history, type) => {
  return (history || []).map((entry) => {
    return [
      {
        text: formatValue(entry.value, type)
      },
      {
        text: entry.dateTime ? formatDateTime(entry.dateTime) : ''
      },
      {
        text: entry.note
      },
      {
        text: entry.setBy
      }
    ]
  })
}

export const featureControlController = {
  async handler(request, h) {
    const { name } = request.query
    if (getFeatureControlSchema.validate(request.query).error) {
      return h.redirect('/')
    }

    const result = await requestFromApi(`feature-control/${name}/detailed`, request)
    const featureControl = result?.response

    if (!featureControl) {
      return h.response('Feature control not found').code(404)
    }

    // Note this will be coming from a new field in the API, but for now we will generate
    const displayName = name
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    const historyRows = createHistoryRows(featureControl.history, featureControl.type)

    return h.view('feature-control/index', {
      pageTitle: `Feature control details - ${displayName}`,
      heading: displayName,
      featureControl,
      formattedValue: formatValue(featureControl.value, featureControl.type, true),
      formattedScopes: formatScopes(featureControl.scopes),
      formattedRoles: formatRoles(featureControl.roleRequired),
      expires: featureControl.expiryDate ? formatDateExplicit(featureControl.expiryDate) : '',
      created: featureControl.created
        ? `${formatDateTimeExplicit(featureControl.created)} by ${featureControl.createdBy}`
        : '',
      updated: featureControl.lastUpdated
        ? `${formatDateTimeExplicit(featureControl.lastUpdated)} by ${featureControl.lastUpdatedBy}`
        : '',
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
      ]
    })
  }
}
