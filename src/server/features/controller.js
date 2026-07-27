import { requestFromApi } from '../helpers/request-from-api.js'
import { formatDateTime } from '../helpers/date-display.js'

export const featuresController = {
  async handler(request, h) {
    const {
      response: { items }
    } = await requestFromApi(`feature-controls`, request)
    const features = modifyFeaturesForDisplay(items)

    return h.view('features/index', {
      pageTitle: `Features`,
      heading: `Features`,
      breadcrumbs: [],
      headers: buildTableHeaders(),
      featureTableRows: buildTableRows(features)
    })
  }
}

export const buildTableHeaders = () => {
  return [
    {
      text: 'Feature',
      attributes: {
        'aria-sort': 'none'
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
        'aria-sort': 'descending'
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
        html: `<a href="/feature-control/detail?name=${feature.name}">${feature.displayName}</a>`,
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

export const modifyFeaturesForDisplay = (features) => {
  const maxLength = 15
  const ellipsis = '...'
  const maxLengthWithoutEllipsis = maxLength - ellipsis.length

  return features.map((feature) => {
    // TODO remove once added to definition
    const displayName = feature.name
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    // value altered for display beyond 'maxLength'
    const valueAsString = valueToString(feature.value)
    const displayValue =
      valueAsString.length > maxLength ? valueAsString.substring(0, maxLengthWithoutEllipsis) + ellipsis : valueAsString

    return { ...feature, displayName, displayValue }
  })
}

function valueToString(value) {
  if (value === undefined) return ''
  if (Array.isArray(value)) {
    return value.map(String).join(',')
  }
  return String(value)
}
