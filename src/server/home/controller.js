import { requestFromApi } from '../helpers/request-from-api.js'
import { formatDateTime } from '../helpers/date-display.js'
import nunjucks from 'nunjucks'

const MAX_ROWS = 3

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
  const env = nunjucks.configure(['src/server/common/templates/partials', 'node_modules/govuk-frontend/dist'])
  const rows = versions.map((version) => {
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
  return { rows: rows.slice(0, MAX_ROWS), isTruncated: rows.length > MAX_ROWS }
}

const createTableData = (allVersions) => {
  return allVersions
    .sort((a, b) => a.grant.localeCompare(b.grant))
    .map((grant) => {
      const { rows, isTruncated } = createRowsForTable(grant.versions)
      return {
        title: grant.grant,
        rows,
        isTruncated
      }
    })
}

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
