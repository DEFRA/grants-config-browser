import { requestFromApi } from '../helpers/request-from-api.js'
import { formatDateExplicit, formatDateTime, formatDateTimeExplicit } from '../helpers/date-display.js'
import Joi from 'joi'
import { statusCodes } from '../common/constants/status-codes.js'

const getFeatureControlSchema = Joi.object({
  name: Joi.string().required()
})

const buildHistoryTableHeaders = () => {
  return [
    {
      text: 'Date'
    },
    {
      text: 'Changed by'
    },
    {
      text: 'Value'
    },
    {
      text: 'Note'
    }
  ]
}

const formatValue = (value, type, isHtml = false) => {
  if (type === 'list-string' || type === 'list-number') {
    if (Array.isArray(value)) {
      if (isHtml) {
        return `<ul class="govuk-list govuk-list--bullet">${value.map(mapValueToListItem).join('')}</ul>`
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

const mapValueToListItem = (value) => `<li>${value}</li>`

const formatScopes = (scopes) => {
  if (!scopes || !Array.isArray(scopes)) {
    return ''
  }
  return `<ul class="govuk-list govuk-list--bullet">${scopes.map(mapValueToListItem).join('')}</ul>`
}

const formatRoles = (roles) => {
  if (!roles || !Array.isArray(roles)) {
    return 'No role required'
  }
  return `<ul class="govuk-list govuk-list--bullet">${roles.map(mapValueToListItem).join('')}</ul>`
}

const formatType = (type) => {
  if (type === 'boolean') {
    return 'Toggle'
  }
  if (type === 'number') {
    return 'Number'
  }
  if (type === 'list-string') {
    return 'Text list'
  }
  if (type === 'list-number') {
    return 'Number list'
  }
  return 'Text'
}

const createHistoryRows = (history, type) => {
  return (history || [])
    .sort((x, y) => (y.dateTime || '').localeCompare(x.dateTime || ''))
    .map((entry) => {
      return [
        {
          text: entry.dateTime ? formatDateTime(entry.dateTime) : ''
        },
        {
          text: entry.setBy
        },
        {
          text: formatValue(entry.value, type)
        },
        {
          text: entry.note
        }
      ]
    })
}

const renderUpdatePage = (request, h, featureControl, errors = null, note = '', submittedValue = null) => {
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

export const featureControlController = {
  detail: {
    async handler(request, h) {
      const { name } = request.query
      if (getFeatureControlSchema.validate(request.query).error) {
        return h.redirect('/features')
      }

      const result = await requestFromApi(`feature-control/${name}/detailed`, request)
      const featureControl = result?.response

      if (!featureControl) {
        return h.response('Feature control not found').code(statusCodes.notFound)
      }

      const historyRows = createHistoryRows(featureControl.history, featureControl.type)

      return h.view('feature-control/index', {
        pageTitle: `Feature control details - ${featureControl.displayName}`,
        heading: featureControl.displayName,
        technicalName: name,
        featureControl,
        formattedValue: formatValue(featureControl.value, featureControl.type, true),
        formattedScopes: formatScopes(featureControl.scopes),
        formattedRoles: formatRoles(featureControl.roleRequired),
        formattedType: formatType(featureControl.type),
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
            text: featureControl.displayName
          }
        ]
      })
    }
  },
  update: {
    async handler(request, h) {
      const { name } = request.query
      if (getFeatureControlSchema.validate(request.query).error) {
        return h.redirect('/features')
      }

      const result = await requestFromApi(`feature-control/${name}/detailed`, request)
      const featureControl = result?.response

      if (!featureControl) {
        return h.response('Feature control not found').code(statusCodes.notFound)
      }

      return renderUpdatePage(request, h, featureControl)
    }
  },
  processUpdate: {
    async handler(request, h) {
      const { name, value: rawValue, note } = request.payload
      const user = request.auth.credentials.displayName

      const resultDetail = await requestFromApi(`feature-control/${name}/detailed`, request)
      const featureControl = resultDetail?.response

      if (!featureControl) {
        return h.response('Feature control not found').code(statusCodes.notFound)
      }

      const errors = {
        summary: []
      }

      if (!note || note.trim() === '') {
        errors.summary.push({ text: 'Enter a note to explain why this change is being made', href: '#note' })
        errors.note = { text: 'Enter a note to explain why this change is being made' }
      }

      let value = rawValue
      if (featureControl.type === 'boolean') {
        value = rawValue === 'true'
      }

      if (value === featureControl.value) {
        errors.summary.push({ text: 'The value must be different from the current value', href: '#value' })
        errors.value = { text: 'The value must be different from the current value' }
      }

      if (errors.summary.length > 0) {
        return renderUpdatePage(request, h, featureControl, errors, note, rawValue)
      }

      const payload = { name, value, user, note }

      const result = await requestFromApi(`feature-control/value`, request, {}, 'PUT', payload)

      if (result?.status !== statusCodes.accepted) {
        return h.redirect(`/feature-control/update?name=${name}`)
      }
      return h.redirect(`/feature-control/detail?name=${name}`)
    }
  }
}
