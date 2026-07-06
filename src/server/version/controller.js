import { requestFromApi } from '../helpers/request-from-api.js'
import Joi from 'joi'

const buildTableHeaders = () => {
  return [
    {
      text: 'Config files',
      attributes: {
        'aria-sort': 'none'
      },
      classes: 'col-25'
    },
    {
      text: 'Actions',
      classes: 'col-25'
    }
  ]
}

const getVisualiseLink = (filename, bucket, grant, version, type) => {
  return `<a class="visualise-link" href="/visualise-${type}?filename=${filename}&bucket=${bucket}&grant=${grant}&version=${version}">
             <img src="/public/assets/images/visualise.svg" class="visualise-icon" alt="" role="presentation" />Visualise</a>`
}

const createRowsForTable = (bucket, manifestEntries, grant, version) => {
  return manifestEntries.map((manifestEntry) => {
    const centringClass = 'vertical-middle'

    let visualizeLink = ''
    if (isGrantsUiJourneyConfig(manifestEntry)) {
      visualizeLink = getVisualiseLink(manifestEntry, bucket, grant, version, 'journey')
    } else if (isGasConfig(manifestEntry)) {
      visualizeLink = getVisualiseLink(manifestEntry, bucket, grant, version, 'gas')
    } else {
      visualizeLink = '&nbsp;'
    }

    return [
      {
        html: `<a class="govuk-!-margin-0" href="/viewfile?filename=${manifestEntry}&bucket=${bucket}">${manifestEntry}</a>`,
        classes: centringClass
      },
      {
        html: visualizeLink,
        classes: centringClass
      }
    ]
  })
}

const getVersionSchema = Joi.object({
  grant: Joi.string().required(),
  version: Joi.string().required()
})

export const versionController = {
  async handler(request, h) {
    const { grant, version } = request.query
    if (getVersionSchema.validate(request.query).error) {
      return h.redirect('/')
    }
    //go fetch metadata from the config broker
    const { response: thisVersion } = await requestFromApi(`version?grant=${grant}&version=${version}`, request)
    const allFiles = createRowsForTable(thisVersion.path, thisVersion.manifest, grant, version)
    return h.view('version/index', {
      pageTitle: `${grant} - ${version}`,
      heading: grant,
      status: thisVersion.status,
      version,
      versionTableRows: allFiles,
      headers: buildTableHeaders(),
      breadcrumbs: [
        {
          text: 'Home',
          href: '/'
        },
        {
          text: grant,
          href: `/grant?grant=${grant}`
        },
        {
          text: version
        }
      ]
    })
  }
}

const isGrantsUiJourneyConfig = (filename) =>
  filename.includes('grants-ui') && filename.endsWith('.yaml') && !filename.toLowerCase().includes('allowlist')
const isGasConfig = (filename) => filename.includes('gas') && filename.endsWith('.json')
