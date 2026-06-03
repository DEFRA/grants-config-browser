import { requestFromApi } from '../helpers/request-from-api.js'
import { formatDateTime } from '../helpers/date-display.js'
import nunjucks from 'nunjucks'
import { config } from '../../config/config.js'

const GRANTS_CONFIG_BROKER_ENDPOINT = config.get('backend.apiEndpoint')

const buildTableHeaders = () => {
  return [
    {
      text: 'Version',
      attributes: {
        'aria-sort': 'none'
      },
      classes: 'col-25'
    },
    {
      text: 'Status',
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

const createRowsForTable = (versions) => {
  const env = nunjucks.configure([
    'src/server/common/templates/partials',
    'node_modules/govuk-frontend/dist'
  ])
  return versions.map((version) => {
    const centringClass = 'vertical-middle'
    return [
      {
        text: version.version,
        classes: centringClass
      },
      {
        html: env.render('tag.njk', { status: version.status }),
        classes: centringClass
      },
      {
        text: formatDateTime(version.lastUpdated),
        attributes: {
          'data-sort-value': new Date(version.lastUpdated).getTime()
        }
      }
    ]
  })
}

const createTableData = (allVersions) => {
  return [...allVersions]
    .sort((a, b) => a.grant.localeCompare(b.grant))
    .map((grant) => ({
      title: grant.grant,
      rows: createRowsForTable(grant.versions)
    }))
}

/**
 * A GDS styled example home page controller.
 */
export const homeController = {
  async handler(request, h) {
    //go fetch metadata from the config broker
    const allVersions = await requestFromApi('allGrants?draft=include', request)
    const allTables = createTableData(allVersions)
    return h.view('home/index', {
      pageTitle: 'Home',
      heading: 'All grant config versions',
      versionTables: allTables ?? [],
      headers: buildTableHeaders()
    })
  }
}
