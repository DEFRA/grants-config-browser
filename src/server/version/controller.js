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
    }
  ]
}

const createRowsForTable = (manifestEntries) => {
  return manifestEntries.map((manifestEntry) => {
    const centringClass = 'vertical-middle'
    return [
      {
        text: manifestEntry,
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
    const thisVersion = await requestFromApi(
      `version?grant=${grant}&version=${version}`,
      request
    )
    const allFiles = createRowsForTable(thisVersion.manifest)
    return h.view('version/index', {
      pageTitle: `${grant} - ${version}`,
      heading: `${grant} - ${version}`,
      versionTableRows: allFiles ?? [],
      headers: buildTableHeaders()
    })
  }
}
