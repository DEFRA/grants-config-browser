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
  const beforeHtml = renderStatusSection(
    getContentForStatus(status?.beforeContent, stage?.beforeContent, phase?.beforeContent, status, stage, phase)
  )

  const tasksHtml = renderStatusTasks(stage?.taskGroups || status?.taskGroups || [])

  const afterHtml = renderStatusSection(
    getContentForStatus(status?.afterContent, stage?.afterContent, phase?.afterContent, status, stage, phase)
  )

  const statusName = status?.name || status?.code?.replace('STATUS_', '').replaceAll('_', ' ') || ''

  let caption = ''
  if (phase && stage) {
    caption = `<span class="govuk-caption-m">${phase.name} - ${stage.name}</span>\n`
  }

  let finalBeforeHtml = beforeHtml
  if (!beforeHtml.length && !tasksHtml.length && !afterHtml.length) {
    finalBeforeHtml = '<p class="govuk-body">There are no tasks to complete.</p>'
  }

  return `
    ${caption}<h2 class="govuk-heading-m govuk-!-margin-bottom-2">${statusName}</h2>
    <p class="govuk-body govuk-!-margin-bottom-0"><strong>Phase:</strong> ${phase?.code || ''}</p>
    <p class="govuk-body govuk-!-margin-bottom-0"><strong>Stage:</strong> ${stage?.code || ''}</p>
    <p class="govuk-body govuk-!-margin-bottom-5"><strong>Status:</strong> ${status?.code || ''}</p>
    ${finalBeforeHtml}
    ${tasksHtml}
    ${afterHtml}
  `.trim()
}

const renderStatusSection = (items) => {
  const rendered = renderDescription(items)
  return rendered ? `<div class="govuk-!-margin-top-4">${rendered}</div>` : ''
}

const renderStatusTasks = (taskGroups) => {
  let html = ''
  if (taskGroups.length > 0) {
    taskGroups.forEach((tg) => {
      if (tg.tasks && tg.tasks.length > 0) {
        html += `<div class="govuk-!-margin-top-4">
          ${tg.name ? `<h3 class="govuk-heading-m">${tg.name}</h3>` : ''}
          ${generateTaskList(tg.tasks)}
        </div>`
      }
    })
  }
  return html
}

const matchesCondition = (renderIf, status, stage, phase) => {
  if (renderIf === undefined || renderIf === null || renderIf === true || renderIf === 'true') {
    return true
  }
  if (renderIf === false || renderIf === 'false') {
    return false
  }

  if (Array.isArray(renderIf)) {
    return renderIf.some((r) => matchesCondition(r, status, stage, phase))
  }

  if (typeof renderIf === 'object') {
    return matchesObjectCondition(renderIf, status, stage, phase)
  }

  if (typeof renderIf === 'string') {
    return matchesStringCondition(renderIf, status, stage, phase)
  }

  return false
}

const matchesObjectCondition = (renderIf, status, stage, phase) => {
  const statusCode = status?.code || ''
  const stageCode = stage?.code || ''
  const phaseCode = phase?.code || ''

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

const matchesStringCondition = (renderIf, status, stage, phase) => {
  const trimmed = renderIf.trim()
  if (!trimmed) {
    return true
  }

  const statusCode = status?.code || ''
  if (statusCode && matchesCodeInExpression(trimmed, statusCode, 'STATUS_')) {
    return true
  }

  const mentionsStatus = /(status|statusCode|position\.status)/i.test(trimmed)
  if (!mentionsStatus) {
    const stageCode = stage?.code || ''
    if (stageCode && matchesCodeInExpression(trimmed, stageCode, 'STAGE_')) {
      return true
    }
    const phaseCode = phase?.code || ''
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
      continue
    }

    const hasRenderIf = entry.renderIf !== undefined && entry.renderIf !== null
    const shouldRender = !hasRenderIf || matchesCondition(entry.renderIf, status, stage, phase)

    if (shouldRender) {
      items.push(...extractItemsFromEntry(entry))
    }
  }
  return items
}

const extractItemsFromEntry = (entry) => {
  if (entry.content) {
    return Array.isArray(entry.content) ? entry.content : [entry.content]
  }
  if (entry.items && !entry.component && !entry.type) {
    return Array.isArray(entry.items) ? entry.items : [entry.items]
  }
  if (entry.component || entry.type || entry.text || entry.html) {
    return [entry]
  }
  return []
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

function renderHeading(c, type, level, classes) {
  const headingLevel = type.startsWith('h') && type.length === 2 ? Number(type[1]) : level
  const tag = `h${headingLevel}`
  const headingClass = `govuk-heading-${levelToHeadingClass(headingLevel)}`
  return `<${tag} class="${buildClasses(headingClass, classes)}">${renderText(c.text || c.content || c.title)}</${tag}>`
}

const COMPONENT_RENDERERS = {
  heading: renderHeading,
  header: renderHeading,
  h1: renderHeading,
  h2: renderHeading,
  h3: renderHeading,
  h4: renderHeading,
  h5: renderHeading,
  h6: renderHeading,
  paragraph: renderParagraph,
  p: renderP,
  'unordered-list': renderUnorderedList,
  'bullet-list': renderBulletList,
  list: renderList,
  ul: renderUl,
  'ordered-list': renderOrderedList,
  ol: renderOl,
  container: renderContainer,
  div: renderDiv,
  group: renderGroup,
  text: renderTextComponent,
  span: renderSpan,
  url: renderUrl,
  link: renderLink,
  a: renderA,
  'line-break': renderLineBreak,
  br: renderBr,
  'inset-text': renderInsetText,
  inset: renderInset,
  'warning-text': renderWarningText,
  warning: renderWarning,
  details: renderDetailsComponent,
  'notification-banner': renderNotificationBanner,
  button: renderButton,
  tag: renderTag,
  html: renderHtml,
  raw: renderRaw
}

function renderP(c, _type, _level, classes) {
  return `<p class="${buildClasses('govuk-body', classes)}">${renderText(c.text || c.content)}</p>`
}

function renderParagraph(c, _type, _level, classes) {
  return `<p class="${buildClasses('govuk-body', classes)}">${renderText(c.text || c.content)}</p>`
}

function renderUnorderedList(c, _type, _level, classes) {
  return `<ul class="${buildClasses('govuk-list govuk-list--bullet', classes)}">${(c.items || []).map(wrapComponentIntoListItem).join('')}</ul>`
}

function renderBulletList(c, _type, _level, classes) {
  return `<ul class="${buildClasses('govuk-list govuk-list--bullet', classes)}">${(c.items || []).map(wrapComponentIntoListItem).join('')}</ul>`
}

function renderList(c, _type, _level, classes) {
  return `<ul class="${buildClasses('govuk-list govuk-list--bullet', classes)}">${(c.items || []).map(wrapComponentIntoListItem).join('')}</ul>`
}

function renderUl(c, _type, _level, classes) {
  return `<ul class="${buildClasses('govuk-list govuk-list--bullet', classes)}">${(c.items || []).map(wrapComponentIntoListItem).join('')}</ul>`
}

function renderOrderedList(c, _type, _level, classes) {
  return `<ol class="${buildClasses('govuk-list govuk-list--number', classes)}">${(c.items || []).map(wrapComponentIntoListItem).join('')}</ol>`
}

function renderOl(c, _type, _level, classes) {
  return `<ol class="${buildClasses('govuk-list govuk-list--number', classes)}">${(c.items || []).map(wrapComponentIntoListItem).join('')}</ol>`
}

function renderContainer(c, _type, _level, classes) {
  return `<div class="${buildClasses('', classes)}">${(c.items || c.content || []).map(renderComponent).join('')}</div>`
}

function renderDiv(c, _type, _level, classes) {
  return `<div class="${buildClasses('', classes)}">${(c.items || c.content || []).map(renderComponent).join('')}</div>`
}

function renderGroup(c, _type, _level, classes) {
  return `<div class="${buildClasses('', classes)}">${(c.items || c.content || []).map(renderComponent).join('')}</div>`
}

function renderTextComponent(c, _type, _level, _classes) {
  return renderText(c.text || c.content)
}

function renderSpan(c, _type, _level, _classes) {
  return renderText(c.text || c.content)
}

function renderUrl(c, _type, _level, classes) {
  return `<a href="#" class="${buildClasses('govuk-link', classes)}">${renderText(c.text || c.content || c.title)}</a>`
}

function renderLink(c, _type, _level, classes) {
  return `<a href="#" class="${buildClasses('govuk-link', classes)}">${renderText(c.text || c.content || c.title)}</a>`
}

function renderA(c, _type, _level, classes) {
  return `<a href="#" class="${buildClasses('govuk-link', classes)}">${renderText(c.text || c.content || c.title)}</a>`
}

function renderLineBreak(_c, _type, _level, _classes) {
  return '<br/>'
}

function renderBr(_c, _type, _level, _classes) {
  return '<br/>'
}

function renderInsetText(c, _type, _level, classes) {
  return `<div class="${buildClasses('govuk-inset-text', classes)}">${renderText(c.text || c.content)}</div>`
}

function renderInset(c, _type, _level, classes) {
  return `<div class="${buildClasses('govuk-inset-text', classes)}">${renderText(c.text || c.content)}</div>`
}

function renderWarningText(c, _type, _level, classes) {
  return `<div class="${buildClasses('govuk-warning-text', classes)}"><span class="govuk-warning-text__icon" aria-hidden="true">!</span><strong class="govuk-warning-text__text"><span class="govuk-visually-hidden">Warning</span>${renderText(c.text || c.content)}</strong></div>`
}

function renderWarning(c, _type, _level, classes) {
  return `<div class="${buildClasses('govuk-warning-text', classes)}"><span class="govuk-warning-text__icon" aria-hidden="true">!</span><strong class="govuk-warning-text__text"><span class="govuk-visually-hidden">Warning</span>${renderText(c.text || c.content)}</strong></div>`
}

function renderDetailsComponent(c, _type, _level, classes) {
  return `<details class="${buildClasses('govuk-details', classes)}"><summary class="govuk-details__summary"><span class="govuk-details__summary-text">${renderText(c.title || c.summary || c.heading || 'Details')}</span></summary><div class="govuk-details__text">${renderText(c.text || c.content)}</div></details>`
}

function renderNotificationBanner(c, _type, _level, classes) {
  return `<div class="${buildClasses('govuk-notification-banner', classes)}"><div class="govuk-notification-banner__header"><h2 class="govuk-notification-banner__title">${renderText(c.title || 'Important')}</h2></div><div class="govuk-notification-banner__content">${renderText(c.text || c.content)}</div></div>`
}

function renderButton(c, _type, _level, classes) {
  return `<button class="${buildClasses('govuk-button', classes)}">${renderText(c.text || c.content)}</button>`
}

function renderTag(c, _type, _level, classes) {
  return `<strong class="${buildClasses('govuk-tag', classes)}">${renderText(c.text || c.content)}</strong>`
}

function renderHtml(c, _type, _level, _classes) {
  return c.html || c.text || c.content || ''
}

function renderRaw(c, _type, _level, _classes) {
  return c.html || c.text || c.content || ''
}

const renderDetails = (c, compType, level) => {
  const classes = c.classes || c.className || ''
  const renderer = COMPONENT_RENDERERS[compType]
  if (renderer) {
    return renderer(c, compType, level, classes)
  }
  return renderText(c.text || c.content || '')
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
