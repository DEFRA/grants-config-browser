export const getConfirmationContent = (node) => {
  let content = ''
  content += `<div class="govuk-panel govuk-panel--confirmation">
  <h1 class="govuk-panel__title">
    ${node.confirmationContent.panelTitle}
  </h1>

  <div class="govuk-panel__body">
    ${node.confirmationContent.panelText}<br><strong>## Reference ##</strong>
  </div>

</div>`
  content += node.confirmationContent.html ?? ''
  return content
}
