import { requestFromApi } from '../helpers/request-from-api.js'
import { formatDateTime } from '../helpers/date-display.js'

export const featuresController = {
  async handler(request, h) {
    const { name, displayName, scope, status = 'active' } = request.query

    const { features, uniqueScopes } = await getFeatures(request, name, displayName, scope, status)

    return h.view('features/index', {
      pageTitle: `Features`,
      heading: `Features`,
      breadcrumbs: [
        {
          text: 'Home',
          href: '/'
        },
        {
          text: 'Features'
        }
      ],
      headers: buildTableHeaders(),
      featureTableRows: buildTableRows(features),
      filters: { name, displayName, scope, status },
      uniqueScopes
    })
  }
}

export const buildTableHeaders = () => {
  return [
    {
      text: 'Feature',
      attributes: {
        'aria-sort': 'ascending'
      },
      classes: 'col-25'
    },
    {
      text: 'Name',
      attributes: {
        'aria-sort': 'none'
      },
      classes: 'col-12'
    },
    {
      text: 'Value',
      attributes: {
        'aria-sort': 'none'
      },
      classes: 'col-12'
    },
    {
      text: 'Last Updated',
      attributes: {
        'aria-sort': 'none'
      },
      classes: 'col-19'
    }
  ]
}

export const buildTableRows = (features) => {
  return features.map((feature) => {
    const isInactive = feature.status !== 'active'
    const rowClass = `vertical-middle ${isInactive ? 'inactive-highlight' : ''}`.trim()

    return [
      {
        html: `
          <details class="govuk-details govuk-!-margin-top-1 govuk-!-margin-bottom-0">
            <summary class="govuk-details__summary">
              <a href="/feature-control/detail?name=${feature.name}">${feature.displayName}</a>
              ${
                ['expired', 'withdrawn', 'removed'].includes(feature.status)
                  ? `<strong class="govuk-tag govuk-tag--grey govuk-!-margin-left-2">${(feature.status === 'removed' ? 'withdrawn' : feature.status).toUpperCase()}</strong>`
                  : ''
              }
            </summary>
            <div class="govuk-details__text">
              <dl class="govuk-summary-list govuk-summary-list--no-border govuk-!-margin-bottom-0">
                <div class="govuk-summary-list__row">
                  <dt class="govuk-summary-list__key">Description</dt>
                  <dd class="govuk-summary-list__value">${feature.description}</dd>
                </div>
                <div class="govuk-summary-list__row">
                  <dt class="govuk-summary-list__key">Scopes</dt>
                  <dd class="govuk-summary-list__value">${feature.scopes}</dd>
                </div>
                <div class="govuk-summary-list__row">
                  <dt class="govuk-summary-list__key">Value</dt>
                  <dd class="govuk-summary-list__value">${detailsDisplayValue(feature.value)}</dd>
                </div>
              </dl>
            </div>
          </details>
        `,
        classes: rowClass
      },
      {
        text: feature.name,
        classes: `${rowClass} ${isInactive ? 'strikethrough' : ''}`.trim()
      },
      {
        text: feature.displayValue,
        classes: rowClass
      },
      {
        text: formatDateTime(feature.lastUpdated),
        classes: rowClass,
        attributes: {
          'data-sort-value': new Date(feature.lastUpdated).getTime()
        }
      }
    ]
  })
}

const getFeatures = async (request, name, displayName, scope, status) => {
  const filters = { name, displayName, scope, status }
  const endpoint = buildEndpointWithQueryParams('feature-controls', filters)

  const {
    response: { items, uniqueScopes }
  } = await requestFromApi(endpoint, request)

  return {
    features: modifyFeaturesForDisplay(items),
    uniqueScopes
  }
}

const buildEndpointWithQueryParams = (endpoint, { name, displayName, scope, status }) => {
  const params = new URLSearchParams()

  if (name) {
    params.append('name', name)
  }
  if (displayName) {
    params.append('displayName', displayName)
  }
  if (scope) {
    params.append('scope', scope)
  }
  if (status) {
    params.append('status', status)
  }

  const queryString = params.toString()
  return queryString ? `${endpoint}?${queryString}` : endpoint
}

const modifyFeaturesForDisplay = (features) => {
  const maxLength = 15
  const ellipsis = '...'
  const maxLengthWithoutEllipsis = maxLength - ellipsis.length

  return features.map((feature) => {
    // value altered for display beyond 'maxLength'
    const valueAsString = valueToString(feature.value)
    const displayValue =
      valueAsString.length > maxLength ? valueAsString.substring(0, maxLengthWithoutEllipsis) + ellipsis : valueAsString

    return { ...feature, displayValue }
  })
}

function valueToString(value) {
  if (Array.isArray(value)) {
    return value.map(String).join(',')
  }
  return String(value)
}

const detailsDisplayValue = (value) => {
  if (Array.isArray(value)) {
    const items = value.map((v) => `<li>${v}</li>`).join('')
    return `<ul class="govuk-list govuk-list--bullet">${items}</ul>`
  }
  return value
}
