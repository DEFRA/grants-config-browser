import { getRadioFieldContent } from './radio-field-content.js'

export const getCheckDetailsContent = (node, lists) => {
  let content = ''
  content += generateSummaryLists(node.details?.displaySections ?? [])
  content += getRadioFieldContent(node, { title: 'Are these details correct?', list: 'details-yes-no' }, lists)
  content += `<p><small><strong>Name:</strong></small> <small>${node.details?.confirmationFieldName}</small></p>`
  content += `<button type="submit" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">
                  Continue
                </button>`
  return content
}

const generateSummaryLists = (sections) => {
  return sections
    .map(
      (section) =>
        `<h2 class="govuk-heading-m">${section.title}</h2>
          <dl class="govuk-summary-list">
          ${section.fields
            .map(
              (field) => `<div class="govuk-summary-list__row">
                                                    <dt class="govuk-summary-list__key">${field.label}</dt>
                                                    <dd class="govuk-summary-list__value">${field.sourcePath}</dd></div>`
            )
            .join('')}
          </dl>`
    )
    .join('')
}
