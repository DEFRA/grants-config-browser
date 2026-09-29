export const createCwTaskTooltipData = (task, phase, stage) => {
  let html = ''
  if (phase && stage) {
    html += `<span class="govuk-caption-l">${phase.name} - ${stage.name}</span>`
  }
  html += `<h1 class="govuk-heading-l">${task.name}</h1>`

  if (task.description) {
    html += renderDescription(task.description)
  }

  if (task.input) {
    html += renderInput(task.input)
  }

  if (task.valueOptions) {
    html += renderValueOptions(task.valueOptions)
  }

  return html
}

const renderDescription = (description) => {
  if (Array.isArray(description)) {
    return description.map((c) => renderComponent(c)).join('')
  }
  if (typeof description === 'string') {
    return `<p class="govuk-body">${description}</p>`
  }
  return ''
}

const levelToHeadingClass = (level) => {
  if (level === 1) {
    return 'l'
  } else if (level === 2) {
    return 'm'
  } else {
    return 's'
  }
}

const wrapComponentIntoListItem = (c) => {
  return `<li>${renderComponent(c)}</li>`
}

const buildClasses = (baseClasses, additionalClasses) => {
  return `${baseClasses} ${additionalClasses || ''}`.trim()
}
const renderComponent = (c) => {
  if (!c?.component) {
    return ''
  }

  const level = c.level || 2
  return renderDetails(c, level)
}

const renderDetails = (c, level) => {
  switch (c.component) {
    case 'heading':
      return `<h${level} class="${buildClasses('govuk-heading-' + levelToHeadingClass(level), c.classes)}">${renderText(c.text)}</h${level}>`
    case 'paragraph':
      return `<p class="${buildClasses('govuk-body', c.classes)}">${renderText(c.text)}</p>`
    case 'unordered-list':
      return `<ul class="${buildClasses('govuk-list govuk-list--bullet', c.classes)}">${c.items.map((item) => wrapComponentIntoListItem(item)).join('')}</ul>`
    case 'ordered-list':
      return `<ol class="${buildClasses('govuk-list govuk-list--number', c.classes)}">${c.items.map((item) => wrapComponentIntoListItem(item)).join('')}</ol>`
    case 'container':
      return `<div class="${buildClasses('', c.classes)}">${(c.items || []).map((item) => renderComponent(item)).join('')}</div>`
    case 'text':
      return renderText(c.text)
    case 'url':
      return `<a href="#" class="${buildClasses('govuk-link', c.classes)}">${renderText(c.text)}</a>`
    case 'line-break':
      return '<br/>'
    default:
      return renderText(c.text)
  }
}

const renderText = (text) => {
  if (!text) {
    return ''
  }
  if (typeof text === 'string') {
    return text
  }
  if (Array.isArray(text)) {
    return text.map((t) => renderComponent(t)).join('')
  }
  return JSON.stringify(text)
}

const renderInput = (input) => {
  let html = '<div class="govuk-form-group">'
  if (input.label) {
    html += `<label class="govuk-label ${input.label.classes || ''}">${renderText(input.label.text)}</label>`
  }
  if (input.hint) {
    html += `<div class="govuk-hint">${Array.isArray(input.hint) ? input.hint.join(' ') : input.hint}</div>`
  }
  if (input.type === 'text') {
    html += `<input class="govuk-input" type="text">`
  }
  html += '</div>'
  return html
}

const renderValueOptions = (options) => {
  let html = '<div class="govuk-form-group"><fieldset class="govuk-fieldset"><div class="govuk-radios">'
  options.forEach((opt, index) => {
    html += `
      <div class="govuk-radios__item">
        <input class="govuk-radios__input" type="radio" id="opt-${index}">
        <label class="govuk-label govuk-radios__label" for="opt-${index}">${opt.name}</label>
      </div>
    `
  })
  html += '</div></fieldset></div>'
  return html
}
