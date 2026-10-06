export const createCwTaskTooltipData = (task, phase, stage) => {
  let html = ''
  if (phase && stage) {
    html += `<span class="govuk-caption-l">${phase.name} - ${stage.name}</span>`
  }
  html += `<h1 class="govuk-heading-l">${task.name}</h1>`

  if (task.beforeContent) {
    const beforeRendered = renderDescription(task.beforeContent)
    if (beforeRendered) {
      html += `<div class="govuk-!-margin-top-4">${beforeRendered}</div>`
    }
  }

  if (task.description) {
    html += renderDescription(task.description)
  }

  if (task.input) {
    html += renderInput(task.input)
  }

  if (task.valueOptions) {
    html += renderValueOptions(task.valueOptions)
  }

  if (task.afterContent) {
    const afterRendered = renderDescription(task.afterContent)
    if (afterRendered) {
      html += `<div class="govuk-!-margin-top-4">${afterRendered}</div>`
    }
  }

  return html
}

export const createCwStatusTooltipData = (status, phase, stage) => {
  const beforeItems = getContentForStatus(
    status?.beforeContent,
    stage?.beforeContent,
    phase?.beforeContent,
    status,
    stage,
    phase
  )
  let beforeHtml = ''
  const beforeRendered = renderDescription(beforeItems)
  if (beforeRendered) {
    beforeHtml = `<div class="govuk-!-margin-top-4">${beforeRendered}</div>`
  }

  let tasksHtml = ''
  const taskGroups = stage?.taskGroups || status?.taskGroups || []
  if (taskGroups.length > 0) {
    taskGroups.forEach((tg) => {
      if (tg.tasks && tg.tasks.length > 0) {
        tasksHtml += `<div class="govuk-!-margin-top-4">
          ${tg.name ? `<h3 class="govuk-heading-m">${tg.name}</h3>` : ''}
          ${generateTaskList(tg.tasks)}
        </div>`
      }
    })
  }

  const afterItems = getContentForStatus(
    status?.afterContent,
    stage?.afterContent,
    phase?.afterContent,
    status,
    stage,
    phase
  )
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

  if (!beforeHtml.length && !tasksHtml.length && !afterHtml.length) {
    beforeHtml = '<p class="govuk-body">There are no tasks to complete.</p>'
  }

  return `
    ${caption}<h2 class="govuk-heading-m govuk-!-margin-bottom-2">${statusName}</h2>
    <p class="govuk-body govuk-!-margin-bottom-0"><strong>Phase:</strong> ${phase?.code || ''}</p>
    <p class="govuk-body govuk-!-margin-bottom-0"><strong>Stage:</strong> ${stage?.code || ''}</p>
    <p class="govuk-body govuk-!-margin-bottom-5"><strong>Status:</strong> ${status?.code || ''}</p>
    ${beforeHtml}
    ${tasksHtml}
    ${afterHtml}
  `.trim()
}

const matchesCondition = (renderIf, status, stage, phase) => {
  if (renderIf === undefined || renderIf === null) {
    return true
  }
  if (renderIf === true || renderIf === 'true') {
    return true
  }
  if (renderIf === false || renderIf === 'false') {
    return false
  }

  const statusCode = status?.code || ''
  const stageCode = stage?.code || ''
  const phaseCode = phase?.code || ''

  if (Array.isArray(renderIf)) {
    return renderIf.some((r) => matchesCondition(r, status, stage, phase))
  }

  if (typeof renderIf === 'object') {
    if (renderIf.statusCode && !matchesCode(renderIf.statusCode, statusCode, 'STATUS_')) {
      return false
    }
    if (renderIf.status && !matchesCode(renderIf.status, statusCode, 'STATUS_')) {
      return false
    }
    if (renderIf.stageCode && !matchesCode(renderIf.stageCode, stageCode, 'STAGE_')) {
      return false
    }
    if (renderIf.phaseCode && !matchesCode(renderIf.phaseCode, phaseCode, 'PHASE_')) {
      return false
    }
    return true
  }

  if (typeof renderIf !== 'string') {
    return false
  }

  const trimmed = renderIf.trim()
  if (!trimmed) {
    return true
  }

  // Check status code matching
  if (statusCode && matchesCodeInExpression(trimmed, statusCode, 'STATUS_')) {
    return true
  }

  // If the expression doesn't mention status-related keywords, check if it matches stage or phase
  const mentionsStatus = /(status|statusCode|position\.status)/i.test(trimmed)
  if (!mentionsStatus) {
    if (stageCode && matchesCodeInExpression(trimmed, stageCode, 'STAGE_')) {
      return true
    }
    if (phaseCode && matchesCodeInExpression(trimmed, phaseCode, 'PHASE_')) {
      return true
    }
  }

  return false
}

const matchesCode = (expected, actual, prefix) => {
  if (!expected || !actual) {
    return false
  }
  const cleanExp = String(expected).trim().toLowerCase()
  const cleanAct = String(actual).trim().toLowerCase()
  if (cleanExp === cleanAct) {
    return true
  }
  const strippedExp = cleanExp.replace(new RegExp(`^${prefix.toLowerCase()}`), '')
  const strippedAct = cleanAct.replace(new RegExp(`^${prefix.toLowerCase()}`), '')
  return strippedExp === strippedAct
}

const matchesCodeInExpression = (expression, code, prefix) => {
  if (!expression || !code) {
    return false
  }
  const strippedCode = code.replace(new RegExp(`^${prefix}`), '')
  const prefixedCode = code.startsWith(prefix) ? code : `${prefix}${code}`
  const codesToTest = [code, strippedCode, prefixedCode].filter(Boolean)

  for (const c of codesToTest) {
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    const quotedRegex = new RegExp(`['"]${escaped}['"]`, 'i')
    if (quotedRegex.test(expression)) {
      return true
    }
    const wordRegex = new RegExp(String.raw`\b${escaped}\b`, 'i')
    if (wordRegex.test(expression)) {
      return true
    }
    if (expression.trim().toLowerCase() === c.toLowerCase()) {
      return true
    }
  }
  return false
}

const extractContent = (contentDef, status, stage, phase) => {
  if (!contentDef) {
    return []
  }
  if (typeof contentDef === 'string') {
    return [contentDef]
  }

  const entries = Array.isArray(contentDef) ? contentDef : [contentDef]
  const items = []

  for (const entry of entries) {
    if (!entry) {
      continue
    }
    if (typeof entry === 'string') {
      items.push(entry)
    } else if (entry.renderIf !== undefined && entry.renderIf !== null) {
      if (matchesCondition(entry.renderIf, status, stage, phase)) {
        if (entry.content) {
          if (Array.isArray(entry.content)) {
            items.push(...entry.content)
          } else {
            items.push(entry.content)
          }
        } else if (entry.items && !entry.component && !entry.type) {
          if (Array.isArray(entry.items)) {
            items.push(...entry.items)
          } else {
            items.push(entry.items)
          }
        } else if (entry.component || entry.type || entry.text || entry.html) {
          items.push(entry)
        }
      }
    } else if (entry.content) {
      if (Array.isArray(entry.content)) {
        items.push(...entry.content)
      } else {
        items.push(entry.content)
      }
    } else if (entry.items && !entry.component && !entry.type) {
      if (Array.isArray(entry.items)) {
        items.push(...entry.items)
      } else {
        items.push(entry.items)
      }
    } else if (entry.component || entry.type || entry.text || entry.html) {
      items.push(entry)
    }
  }
  return items
}

const getContentForStatus = (statusContentDef, stageContentDef, phaseContentDef, status, stage, phase) => {
  const statusContent = extractContent(statusContentDef, status, stage, phase)
  const stageContent = extractContent(stageContentDef, status, stage, phase)
  const phaseContent = extractContent(phaseContentDef, status, stage, phase)
  return [...statusContent, ...stageContent, ...phaseContent]
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
  if (!description) {
    return ''
  }
  if (Array.isArray(description)) {
    return description
      .map((c) => renderComponent(c))
      .filter(Boolean)
      .join('')
  }
  if (typeof description === 'string') {
    return `<p class="govuk-body">${description}</p>`
  }
  if (typeof description === 'object') {
    return renderComponent(description)
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
  if (typeof c === 'string') {
    return `<li>${c}</li>`
  }
  return `<li>${renderComponent(c)}</li>`
}

const buildClasses = (baseClasses, additionalClasses) => {
  return `${baseClasses} ${additionalClasses || ''}`.trim()
}

const renderComponent = (c) => {
  if (!c) {
    return ''
  }
  if (typeof c === 'string') {
    return `<p class="govuk-body">${c}</p>`
  }

  const compType = (c.component || c.type || '').toLowerCase()
  if (!compType) {
    if (c.text) {
      return `<p class="govuk-body">${renderText(c.text)}</p>`
    }
    if (c.html) {
      return c.html
    }
    if (c.content) {
      return renderDescription(c.content)
    }
    if (c.items) {
      return `<div>${(c.items || []).map((item) => renderComponent(item)).join('')}</div>`
    }
    return ''
  }

  const level = c.level || 2
  return renderDetails(c, compType, level)
}

const renderDetails = (c, compType, level) => {
  const classes = c.classes || c.className || ''
  switch (compType) {
    case 'heading':
    case 'header':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const headingLevel = compType.startsWith('h') && compType.length === 2 ? Number(compType[1]) : level
      return `<h${headingLevel} class="${buildClasses('govuk-heading-' + levelToHeadingClass(headingLevel), classes)}">${renderText(c.text || c.content || c.title)}</h${headingLevel}>`
    }
    case 'paragraph':
    case 'p':
      return `<p class="${buildClasses('govuk-body', classes)}">${renderText(c.text || c.content)}</p>`
    case 'unordered-list':
    case 'bullet-list':
    case 'list':
    case 'ul':
      return `<ul class="${buildClasses('govuk-list govuk-list--bullet', classes)}">${(c.items || []).map((item) => wrapComponentIntoListItem(item)).join('')}</ul>`
    case 'ordered-list':
    case 'ol':
      return `<ol class="${buildClasses('govuk-list govuk-list--number', classes)}">${(c.items || []).map((item) => wrapComponentIntoListItem(item)).join('')}</ol>`
    case 'container':
    case 'div':
    case 'group':
      return `<div class="${buildClasses('', classes)}">${(c.items || c.content || []).map((item) => renderComponent(item)).join('')}</div>`
    case 'text':
    case 'span':
      return renderText(c.text || c.content)
    case 'url':
    case 'link':
    case 'a':
      return `<a href="#" class="${buildClasses('govuk-link', classes)}">${renderText(c.text || c.content || c.title)}</a>`
    case 'line-break':
    case 'br':
      return '<br/>'
    case 'inset-text':
    case 'inset':
      return `<div class="${buildClasses('govuk-inset-text', classes)}">${renderText(c.text || c.content)}</div>`
    case 'warning-text':
    case 'warning':
      return `<div class="${buildClasses('govuk-warning-text', classes)}"><span class="govuk-warning-text__icon" aria-hidden="true">!</span><strong class="govuk-warning-text__text"><span class="govuk-visually-hidden">Warning</span>${renderText(c.text || c.content)}</strong></div>`
    case 'details':
      return `<details class="${buildClasses('govuk-details', classes)}"><summary class="govuk-details__summary"><span class="govuk-details__summary-text">${renderText(c.title || c.summary || c.heading || 'Details')}</span></summary><div class="govuk-details__text">${renderText(c.text || c.content)}</div></details>`
    case 'notification-banner':
      return `<div class="${buildClasses('govuk-notification-banner', classes)}"><div class="govuk-notification-banner__header"><h2 class="govuk-notification-banner__title">${renderText(c.title || 'Important')}</h2></div><div class="govuk-notification-banner__content">${renderText(c.text || c.content)}</div></div>`
    case 'button':
      return `<button class="${buildClasses('govuk-button', classes)}">${renderText(c.text || c.content)}</button>`
    case 'tag':
      return `<strong class="${buildClasses('govuk-tag', classes)}">${renderText(c.text || c.content)}</strong>`
    case 'html':
    case 'raw':
      return c.html || c.text || c.content || ''
    default:
      return renderText(c.text || c.content || '')
  }
}

const renderText = (text) => {
  if (text === undefined || text === null) {
    return ''
  }
  if (typeof text === 'string') {
    return text
  }
  if (Array.isArray(text)) {
    return text.map((t) => (typeof t === 'string' ? t : renderComponent(t))).join('')
  }
  if (typeof text === 'object') {
    if (text.component || text.type) {
      return renderComponent(text)
    }
    return JSON.stringify(text)
  }
  return String(text)
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
