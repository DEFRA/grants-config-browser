import { requestFromApi } from '../helpers/request-from-api.js'
import { formatDateTime } from '../helpers/date-display.js'

export const featuresController = {
  async handler(request, h) {
    const { name } = request.query
    const features = await getFeatures(request, name)

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
      filters: { name }
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
  const centringClass = 'vertical-middle'

  return features.map((feature) => {
    return [
      {
        html: `
          <details class="govuk-details govuk-!-margin-top-1 govuk-!-margin-bottom-0">
            <summary class="govuk-details__summary">
              <a href="/feature-control/detail?name=${feature.name}">${feature.displayName}</a>
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
        classes: centringClass
      },
      {
        text: feature.name,
        classes: centringClass
      },
      {
        text: feature.displayValue,
        classes: centringClass
      },
      {
        text: formatDateTime(feature.lastUpdated),
        classes: centringClass,
        attributes: {
          'data-sort-value': new Date(feature.lastUpdated).getTime()
        }
      }
    ]
  })
}

const getFeatures = async (request, name) => {
  const filters = { name }
  const endpoint = buildEndpointWithQueryParams('feature-controls', filters)

  const {
    response: { items }
  } = await requestFromApi(endpoint, request)

  return modifyFeaturesForDisplay(items)
}

const buildEndpointWithQueryParams = (endpoint, { name }) => {
  let queryString = ''

  if (name) {
    queryString = `?name=${name}`
  }

  return `${endpoint}${queryString}`
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
