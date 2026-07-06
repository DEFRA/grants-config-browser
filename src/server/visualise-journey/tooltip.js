const TEXTFIELD_COMPONENT_TYPES = new Set([
  'TextField',
  'NumberField',
  'NationalGridFieldNumberField',
  'AutocompleteField',
  'EmailAddressField',
  'TelephoneNumberField',
  'UkAddressField'
])

const DATE_FIELD_TYPES = new Set(['DatePartsField', 'MonthYearField'])
const RADIOBUTTON_FIELD_TYPES = new Set(['YesNoField', 'RadiosField'])
const NON_INPUT_FIELD_TYPES = new Set(['Html', 'Details', 'Markdown', 'InsetText'])

export const createTooltipData = (node, sections, sectionTitle, lists) => {
  let ttd = ''
  if (sectionTitle) {
    ttd = `<span class="govuk-caption-l">${sectionTitle}</span>`
  }
  ttd += `<h1 class="govuk-heading-l">${node.title}</h1></br>`

  if (node.config?.topSection) {
    ttd += node.config.topSection
  }

  for (const component of node.components) {
    ttd += customiseToolTipDataForComponentType(component, node, lists)
  }

  if (!node.components?.length) {
    ttd += getControllerSpecificMessage(node, sections)
  } else if (!node.terminal) {
    ttd += getContinueButton(node)
  }
  return ttd
}

const customiseToolTipDataForComponentType = (component, node, lists) => {
  let ttd = ''
  if (NON_INPUT_FIELD_TYPES.has(component.type)) {
    //this includes some components that should be collapsible, inset, markdown etc but for now just show the content
    ttd += component.content
  } else if (RADIOBUTTON_FIELD_TYPES.has(component.type)) {
    ttd += getRadioFieldContent(node, component, lists)
  } else if (component.type === 'List') {
    ttd += getListsContent(component, lists)
  } else if (TEXTFIELD_COMPONENT_TYPES.has(component.type)) {
    ttd += getTextFieldContent(node, component)
  } else if (component.type === 'MultilineTextField') {
    ttd += getMultiLineTextFieldContent(node, component)
  } else if (DATE_FIELD_TYPES.has(component.type)) {
    ttd += getDateFieldContent(node, component)
  } else if (component.type === 'CheckboxesField') {
    ttd += getCheckBoxesContent(node, component, lists)
  } else if (component.type === 'SelectField') {
    ttd += getSelectFieldContent(component, lists)
  } else {
    ttd += `<h2>${component.title}</h2>`
  }

  if (!NON_INPUT_FIELD_TYPES.has(component.type)) {
    ttd += `<p><small><strong>Name:</strong></small> <small>${component.name}</small></p>`
  }

  return ttd
}

const getSelectFieldContent = (component, lists) => {
  return `<div class="govuk-form-group">
                      <label class="govuk-label govuk-label--m" for="selectField">${component.title}</label>
                      <select class="govuk-select" id="selectField" name="selectField">
                        ${createSelectOptions(lists, component.list)}
                      </select>
                  </div>`
}

const getRadioFieldContent = (node, component, lists) => {
  const possibleHintPrefix = component.hint ? '<h2 class="govuk-hint">' + component.hint : ''
  return `<div class="govuk-form-group">
                    <fieldset class="govuk-fieldset">
                      <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
                          ${node.components.length === 1 ? possibleHintPrefix : '<h2 class="govuk-fieldset__heading">' + component.title}
                        </h2>
                      </legend>
                      <div class="govuk-radios" data-module="govuk-radios">
                        ${createRadioOptions(lists, component.type === 'YesNoField' ? 'yes-no' : component.list)}
                      </div>
                    </fieldset>
                  </div>`
}

const getCheckBoxesContent = (node, component, lists) => {
  const possibleHintPrefix = component.hint ? '<h2 class="govuk-hint">' + component.hint : ''
  return `<div class="govuk-form-group">
                    <fieldset class="govuk-fieldset">
                      <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
                          ${node.components.length === 1 ? possibleHintPrefix : '<h2 class="govuk-fieldset__heading">' + component.title}
                        </h2>
                      </legend>
                      <div class="govuk-checkboxes" data-module="govuk-checkboxes">
                        ${createCbOptions(lists, component.list)}
                      </div>
                    </fieldset>
                  </div>`
}

const getListsContent = (component, lists) => {
  return `<div class="govuk-form-group">
                  <h2 class="govuk-heading-m govuk-!-margin-bottom-3">
                    ${component.title}
                  </h2>
                  <ul class="govuk-list govuk-list--bullet">
                  ${
                    lists
                      .find((l) => l.id === component.list)
                      ?.items.map((item) => `<li>${item.text}</li>`)
                      .join('') || ''
                  }
                  </ul>
                  </div>`
}

const getTextFieldContent = (node, component) => {
  return `<div class="govuk-form-group">
                    ${createLabellingForTextField(component, node.components.length)}
                    <input class="govuk-input govuk-!-width-two-thirds" id="textField" name="textField" type="text"
                    ${component.type === 'UkAddressField' ? `value="Address Field - multiple fields will be shown on real UI"` : ''}>
                  </div>`
}

const getMultiLineTextFieldContent = (node, component) => {
  return `<div class="govuk-form-group">
                    ${createLabellingForTextField(component, node.components.length)}
                    <textarea class="govuk-textarea govuk-js-character-count" id="textField" name="textField" rows="${component.options?.rows ?? 10}"></textarea>
                    <div class="govuk-hint govuk-character-count__message govuk-character-count__status" aria-hidden="true">You have ${component.options?.maxWords ?? 0} words remaining</div>
                  </div>`
}

const getDateFieldContent = (node, component) => {
  return `<div class="govuk-form-group">
                    ${createLabellingForTextField(component, node.components.length)}
                    <div class="govuk-date-input" autocomplete="off" id="datePartsField">
                      ${component.type === 'DatePartsField' ? getDateFieldInput('day') : ''}
                      ${getDateFieldInput('month')}
                      ${getDateFieldInput('year')}
                    </div>
                  </div>`
}

const getDateFieldInput = (element) => {
  return `<div class="govuk-date-input__item">
            <div class="govuk-form-group">
              <label class="govuk-label govuk-date-input__label" for="datePartsField__${element}">
                ${element.charAt(0).toUpperCase() + element.slice(1)}
              </label>
              <input class="govuk-input govuk-date-input__input govuk-input--width-${element === 'year' ? 4 : 2}" id="datePartsField__${element}" name="datePartsField__${element}" type="text" inputmode="numeric">
            </div>
          </div>`
}

const getContinueButton = (node) => {
  return `<button type="submit" class="govuk-button" data-module="govuk-button" data-govuk-button-init="">
                  ${node.controller === 'StartPageController' ? 'Start Now >' : 'Save and continue'}
                </button>`
}

const getControllerSpecificMessage = (node, sections) => {
  const controllerSpecificMessage =
    node.controller === 'TaskListPageController' ? '' : `<p><strong>No configurable components</strong></p>`
  switch (node.controller) {
    case 'CheckDetailsController':
      return (
        controllerSpecificMessage +
        '<p>CheckDetailsController provides person/business details and selector to indicate if correct or not</p>'
      )
    case 'TaskListPageController':
      return generateTaskList(sections)
    case 'CheckResponsesPageController':
      return controllerSpecificMessage + '<p>CheckResponsesPageController provides a check of answers supplied</p>'
    case 'PaymentPageController':
      return controllerSpecificMessage + node.config?.paymentExplanation
    case 'DeclarationPageController':
      return (
        controllerSpecificMessage +
        '<p>DeclarationPageController provides a declaration page for users to confirm their information</p>'
      )
    default:
      return ''
  }
}

const generateTaskList = (sections) => {
  return `<ul class="govuk-task-list">
    ${sections
      .map((section) => {
        return `<li class = "govuk-task-list__item govuk-task-list__item--with-link">
        <div class="govuk-task-list__name-and-hint">
        ${section.title}
        </div>
      </li>`
      })
      .join('')}
  </ul>
  `
}

const createRadioOptions = (lists, id) => {
  const list = lists.find((l) => l.id === id)
  if (!list) {
    return `
        <div class="govuk-radios__item">
          <input class="govuk-radios__input" id="external" name="${id}" type="radio" value="external">
          <label class="govuk-label govuk-radios__label" for="external">
            Options defined externally
          </label>
        </div>
      `
  }

  return list.items
    .map(
      (item) => `
        <div class="govuk-radios__item">
          <input class="govuk-radios__input" id="${item.value}" name="${id}" type="radio" value="${item.value}">
          <label class="govuk-label govuk-radios__label" for="${item.value}">
            ${item.text}
          </label>
          ${item.description ? `<div id="govuk-hint govuk-radios__hint" class="govuk-hint govuk-radios__hint">${item.description}</div>` : ''}
        </div>
      `
    )
    .join('')
}

const createCbOptions = (lists, id) => {
  const list = lists.find((l) => l.id === id)
  if (!list) {
    return `
        <div class="govuk-checkboxes__item">
          <input class="govuk-checkboxes__input" id="external" name="${id}" type="checkbox" value="external">
          <label class="govuk-label govuk-checkboxes__label" for="external">
            Options defined externally
          </label>
        </div>
      `
  }

  return list.items
    .map(
      (item) => `
        <div class="govuk-checkboxes__item">
          <input class="govuk-checkboxes__input" id="${item.value}" name="${id}" type="checkbox" value="${item.value}">
          <label class="govuk-label govuk-checkboxes__label" for="${item.value}">
            ${item.text}
          </label>
          ${item.description ? `<div id="govuk-hint govuk-checkboxes__hint" class="govuk-hint govuk-checkboxes__hint">${item.description}</div>` : ''}
        </div>
      `
    )
    .join('')
}

const createSelectOptions = (lists, id) => {
  const list = lists.find((l) => l.id === id)
  if (!list) {
    return `<option value="selectFieldOption-A1">Options defined externally</option>`
  }

  const selectOptions = list.items.map((item) => `<option value="${item.value}">${item.text}</option>`)
  selectOptions.unshift(`<option value=""></option>`)

  return selectOptions.join('')
}

const createLabellingForTextField = (component, componentsLength) => {
  //if this is only component then no need to show the title as already shown
  if (componentsLength === 1) {
    return component.hint ? `<label class="govuk-label" for="textField">${component.hint}</label>` : ''
  }

  const hintSuffix = component.hint ? `<div id="text-hint" class="govuk-hint">${component.hint}</div>` : ''

  return `<label class="govuk-label" for="textField">${component.title}</label>${hintSuffix}`
}
