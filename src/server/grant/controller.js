import { requestFromApi } from '../helpers/request-from-api.js'
import Joi from 'joi'
import { formatDateTime } from '../helpers/date-display.js'
import nunjucks from 'nunjucks'

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

const createRowsForTable = (versions, grant) => {
  const env = nunjucks.configure(['src/server/common/templates/partials', 'node_modules/govuk-frontend/dist'])
  return versions.map((version) => {
    const centringClass = 'vertical-middle'
    return [
      {
        html: `<a href="/version?grant=${grant}&version=${version.version}">${version.version}</a>`,
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

const getAllVersionsSchema = Joi.object({
  grant: Joi.string().required(),
  draft: Joi.string().lowercase().valid('include', 'only').optional(),
  constrainMajor: Joi.alternatives().conditional('constrainMinor', {
    is: Joi.exist(),
    then: Joi.number().min(0).required(),
    otherwise: Joi.number().min(0).optional()
  }),
  constrainMinor: Joi.number().min(0).optional()
})

export const grantController = {
  async handler(request, h) {
    const { grant } = request.query
    if (getAllVersionsSchema.validate(request.query).error) {
      return h.redirect('/')
    }
    //go fetch metadata from the config broker
    const { response: allVersions } = await requestFromApi(`allVersions?grant=${grant}&draft=include`, request)

    const allTables = createRowsForTable(allVersions, grant)
    return h.view('grant/index', {
      pageTitle: `All versions of ${grant}`,
      heading: `${grant} config versions`,
      versionTableRows: allTables,
      headers: buildTableHeaders(),
      breadcrumbs: [
        {
          text: 'Home',
          href: '/'
        },
        {
          text: grant
        }
      ]
    })
  }
}
