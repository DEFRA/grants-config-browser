import { requestFromApi } from '../helpers/request-from-api.js'
import Joi from 'joi'
import { formatDateTime } from '../helpers/date-display.js'
import nunjucks from 'nunjucks'
import { formatValue } from '../feature-control/helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'

const defaultArchivingError = 'The request could not be completed'

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
    },
    {
      text: 'Actions'
    }
  ]
}

const buildArchiveActionForm = (version, grant, archivedIncluded) => {
  const hiddenArchived = archivedIncluded ? '<input type="hidden" name="archived" value="include">' : ''
  const hiddenInputs =
    `<input type="hidden" name="grant" value="${grant}">` +
    `<input type="hidden" name="version" value="${version.version}">` +
    hiddenArchived
  return version.archived
    ? `<form method="GET" action="/version/unarchive">${hiddenInputs}<button class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" data-module="govuk-button">Unarchive</button></form>`
    : `<form method="GET" action="/version/archive">${hiddenInputs}<button class="govuk-button govuk-!-margin-bottom-0" data-module="govuk-button">Archive</button></form>`
}

const createRowsForTable = (versions, grant, archivedIncluded) => {
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
        classes: centringClass,
        attributes: {
          'data-sort-value': new Date(version.lastUpdated).getTime()
        }
      },
      {
        html: buildArchiveActionForm(version, grant, archivedIncluded),
        classes: centringClass
      }
    ]
  })
}

const buildFeatureControlTableHeaders = () => {
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

const createFeatureControlRows = (features) => {
  return features.map((feature) => {
    const centringClass = 'vertical-middle'
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
        text: formatValue(feature.value, feature.type),
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

const getAllVersionsSchema = Joi.object({
  grant: Joi.string().required(),
  draft: Joi.string().lowercase().valid('include', 'only').optional(),
  archived: Joi.string().lowercase().valid('include').optional(),
  constrainMajor: Joi.alternatives().conditional('constrainMinor', {
    is: Joi.exist(),
    then: Joi.number().min(0).required(),
    otherwise: Joi.number().min(0).optional()
  }),
  constrainMinor: Joi.number().min(0).optional()
})

export const grantController = {
  async handler(request, h) {
    const { grant, archived } = request.query
    if (getAllVersionsSchema.validate(request.query).error) {
      return h.redirect('/')
    }
    //go fetch metadata from the config broker
    const archivedParam = archived ? '&archived=included' : ''
    const { response: allVersions } = await requestFromApi(
      `allVersions?grant=${grant}&draft=include${archivedParam}`,
      request
    )

    const { response: featureControlsResponse } = await requestFromApi(`feature-controls?scope=grant.${grant}`, request)
    const featureControls = featureControlsResponse?.items || []

    const allTables = createRowsForTable(allVersions, grant, archived === 'include')
    return h.view('grant/index', {
      pageTitle: `All versions of ${grant}`,
      heading: `${grant} config versions`,
      grant,
      archivedIncluded: archived === 'include',
      versionTableRows: allTables,
      headers: buildTableHeaders(),
      featureControlTableRows: createFeatureControlRows(featureControls),
      featureControlHeaders: buildFeatureControlTableHeaders(),
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

const postArchivingSchema = Joi.object({
  grant: Joi.string().required(),
  version: Joi.string().required(),
  archived: Joi.string().lowercase().valid('include').optional()
})

const renderArchivingConfirmation = (request, h, action) => {
  if (postArchivingSchema.validate(request.query).error) {
    return h.redirect('/')
  }
  const { grant, version, archived } = request.query
  const archivedIncluded = archived === 'include'
  const archivedParam = archivedIncluded ? '&archived=include' : ''
  return h.view('grant/confirm-archiving', {
    pageTitle: `Confirm ${action}`,
    action,
    grant,
    version,
    archivedIncluded,
    cancelUrl: `/grant?grant=${grant}${archivedParam}`
  })
}

export const confirmArchiveHandler = (request, h) => renderArchivingConfirmation(request, h, 'archive')

export const confirmUnarchiveHandler = (request, h) => renderArchivingConfirmation(request, h, 'unarchive')

const storeArchivingOutcome = (request, record) =>
  request.server.session.set(`${request.auth.credentials.sessionId}-archiving`, record)

const submitArchivingAction = async (request, h, action) => {
  const { grant, version, archived } = request.payload

  const validation = postArchivingSchema.validate(request.payload)
  if (validation.error) {
    await storeArchivingOutcome(request, { status: 'failure', action, version, error: validation.error.message })
    return h.redirect('/')
  }

  const user = request.auth.credentials.displayName
  const result = await requestFromApi(`version/${action}`, request, {}, 'POST', { grant, version, user }, true)

  const record =
    result?.status === statusCodes.ok
      ? { status: 'success', action, version }
      : { status: 'failure', action, version, error: result?.error ?? defaultArchivingError }
  await storeArchivingOutcome(request, record)

  const archivedParam = archived === 'include' ? '&archived=include' : ''
  return h.redirect(`/grant?grant=${grant}${archivedParam}`)
}

export const archiveVersionHandler = (request, h) => submitArchivingAction(request, h, 'archive')

export const unarchiveVersionHandler = (request, h) => submitArchivingAction(request, h, 'unarchive')
