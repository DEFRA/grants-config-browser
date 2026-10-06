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

export const createCwStatusTooltipData = (status, phase, stage) => {
  const beforeItems = getContentForStatus(status?.beforeContent, stage?.beforeContent, status?.code)
  let beforeHtml = ''
  const beforeRendered = renderDescription(beforeItems)
  console.log('Before rendered:', beforeRendered)
  if (beforeRendered) {
    beforeHtml = `<div class="govuk-!-margin-top-4">${beforeRendered}</div>`
  }

  let tasksHtml = ''
  const taskGroups = stage?.taskGroups || status?.taskGroups || []
  if (taskGroups.length > 0) {
    taskGroups.forEach((tg) => {
      if (tg.tasks && tg.tasks.length > 0) {
        tasksHtml += `<div class="govuk-!-margin-top-4">
          ${tg.name ? `<strong class="govuk-body">${tg.name}:</strong>` : ''}
          ${generateTaskList(tg.tasks)}
        </div>`
      }
    })
  }

  const afterItems = getContentForStatus(status?.afterContent, stage?.afterContent, status?.code)
  let afterHtml = ''
  const afterRendered = renderDescription(afterItems)
  if (afterRendered) {
    afterHtml = `<div class="govuk-!-margin-top-4">${afterRendered}</div>`
  }

  const statusName = status?.name || status?.code?.replace('STATUS_', '').replaceAll('_', ' ') || ''

  let caption = ''
  if (phase && stage) {
    caption = `<span class="govuk-caption-m">${phase.name} - ${stage.name}</span>\n`
  }

  return `
    ${caption}<h2 class="govuk-heading-m govuk-!-margin-bottom-2">${statusName}</h2>
    <p class="govuk-body govuk-!-margin-bottom-0"><strong>Phase:</strong> ${phase?.code || ''}</p>
    <p class="govuk-body govuk-!-margin-bottom-0"><strong>Stage:</strong> ${stage?.code || ''}</p>
    <p class="govuk-body govuk-!-margin-bottom-0"><strong>Status:</strong> ${status?.code || ''}</p>
    ${beforeHtml}
    ${tasksHtml}
    ${afterHtml}
  `.trim()
}

const matchesStatusCode = (renderIf, statusCode) => {
  if (!renderIf || !statusCode) {
    return false
  }
  if (typeof renderIf !== 'string') {
    return false
  }
  const quotedRegex = new RegExp(`['"]${statusCode}['"]`)
  if (quotedRegex.test(renderIf)) {
    return true
  }
  const wordRegex = new RegExp(String.raw`\b${statusCode}\b`)
  if (wordRegex.test(renderIf)) {
    return true
  }
  return renderIf.trim() === statusCode
}

const extractContent = (contentDef, statusCode) => {
  if (!contentDef) {
    return []
  }
  console.log('Extracting content for status code', statusCode)
  if (typeof contentDef === 'string') {
    return [contentDef]
  }
  if (!Array.isArray(contentDef)) {
    if (contentDef.content) {
      return Array.isArray(contentDef.content) ? contentDef.content : [contentDef.content]
    }
    if (contentDef.component) {
      return [contentDef]
    }
    return []
  }

  const items = []
  for (const entry of contentDef) {
    if (!entry) {
      continue
    }
    if (typeof entry === 'string') {
      items.push(entry)
    } else if (entry.renderIf) {
      if (matchesStatusCode(entry.renderIf, statusCode)) {
        if (entry.content) {
          if (Array.isArray(entry.content)) {
            items.push(...entry.content)
          } else {
            items.push(entry.content)
          }
        } else if (entry.component) {
          items.push(entry)
        }
      }
    } else if (entry.content) {
      if (Array.isArray(entry.content)) {
        items.push(...entry.content)
      } else {
        items.push(entry.content)
      }
    } else if (entry.component) {
      items.push(entry)
    }
  }
  return items
}

const getContentForStatus = (statusContentDef, stageContentDef, statusCode) => {
  const statusContent = extractContent(statusContentDef, statusCode)
  if (statusContent.length > 0) {
    console.log('Using status content for status code', statusCode, statusContent)
    return statusContent
  }
  return extractContent(stageContentDef, statusCode)
}

export const generateTaskList = (tasks) => {
  return `<ul class="govuk-task-list">
    ${tasks
      .map((task) => {
        const status = 'Incomplete'
        //task.initialStatus || (task.mandatory ? 'Mandatory' : 'Optional')
        const tagClasses = task.initialClasses ? ` ${task.initialClasses}` : ''
        return `<li class="govuk-task-list__item govuk-task-list__item--with-link">
        <div class="govuk-task-list__name-and-hint">
        ${task.name || task.title}${task.mandatory ? '*' : ''}
        </div>
        <div class="govuk-task-list__status">
          <strong class="govuk-tag${tagClasses}">
            ${status}
          </strong>
        </div>
      </li>`
      })
      .join('')}
  </ul>
  `
}

const renderDescription = (description) => {
  console.log('Rendering description:', description)
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
  if (typeof c === 'string') {
    return `<p class="govuk-body">${c}</p>`
  }
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
