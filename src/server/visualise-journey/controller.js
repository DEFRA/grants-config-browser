import yaml from 'js-yaml'
import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'
import { statusCodes } from '../common/constants/status-codes.js'

export const visualiseJourneyController = {
  async handler(request, h) {
    const { bucket, filename, showComponents } = request.query || {}
    const showComponentsBoolean = showComponents === 'true'

    const tooltipData = {}

    let config
    try {
      let fileContent
      if (bucket && filename) {
        fileContent = await getS3FileContent(bucket, filename)
      } else {
        throw new Error('No bucket or filename provided')
      }
      config = yaml.load(fileContent)
    } catch (e) {
      return h.response(`Error loading YAML: ${e.message}`).code(statusCodes.internalServerError)
    }

    const sections = config.sections || []
    const lists = config.lists || []
    const pages = config.pages || []
    const conditionsList = config.conditions || []

    lists.push({
      id: 'yes-no',
      items: [
        { text: 'Yes', value: 'yes' },
        { text: 'No', value: 'no' }
      ]
    })

    // for each condition, see which page's component it links to
    conditionsList.forEach((condition) => {
      const componentId = condition.items?.[0]?.componentId
      const matchingPage = pages.find((page) => page.components?.some((component) => component.id === componentId))
      if (matchingPage) {
        condition.onPageId = matchingPage.id
      }
    })

    const nodes = pages.map((page) => ({
      id: page.id,
      title: page.title,
      path: page.path,
      section: page.section,
      controller: page.controller,
      condition: page.condition,
      terminal: page.terminal || page.controller?.includes('Terminal') || false,
      next: page.next,
      config: page.config || {},
      components: (page.components || []).map((c) => ({
        type: c.type,
        title: c.title || 'Component',
        shortDescription: c.shortDescription,
        id: c.id,
        list: c.list,
        content: c.content,
        hint: c.hint,
        name: c.name,
        options: c.options
      }))
    }))

    // Build flow links
    const links = []

    const createConditionalLabelAndLink = (page, condition, nextPageId) => {
      const component = page.components?.find((c) => c.id === condition.items?.[0]?.componentId)

      const label =
        condition && component && condition.items?.[0]
          ? `${component.shortDescription || component.title} ${condition.items[0].operator} ${getValue(condition.items[0], lists)}`
          : ''

      links.push({
        source: page.id,
        target: nextPageId,
        type: 'conditional',
        label
      })
    }

    pages.forEach((page, index) => {
      // If it's a terminal page, it has no next links
      if (page.terminal || page.controller?.includes('Terminal')) {
        return
      }

      let foundNextPage = false

      // Check the NEXT page in the list to see if it's conditional
      let nextPageIndex = index + 1
      let nextPage = pages[nextPageIndex]

      while (!foundNextPage && nextPage) {
        if (nextPage.condition) {
          // To the nextPage if the condition is true and the condition belongs to current page component
          const condition = conditionsList.find((c) => c.id === nextPage.condition)
          if (condition.onPageId === page.id) {
            createConditionalLabelAndLink(page, condition, nextPage.id)
          }
        } else {
          // If the next page is NOT conditional, just link to it
          links.push({
            source: page.id,
            target: nextPage.id,
            type: 'default'
          })
          foundNextPage = true
        }
        nextPageIndex += 1
        nextPage = pages[nextPageIndex]
      }
    })

    // Prepare Mermaid graph definition
    let mermaidGraph = 'flowchart TD\n'

    const renderNode = (node, showComponents, sectionTitle) => {
      const title = node.terminal ? `🚩 ${node.title}` : node.title
      const shapeStart = node.terminal ? '((' : '['
      const shapeEnd = node.terminal ? '))' : ']'
      const componentDetails = showComponents ? `<ul>${componentsAsListItems(node.components)}</ul>` : ''

      tooltipData[node.id] = createTooltipData(node, sectionTitle, lists)
      return `    ${node.id}${shapeStart}"${title}<br/><small>${node.path}</small>${componentDetails}"${shapeEnd}\n`
    }

    // Group nodes by section for Mermaid subgraphs
    sections.forEach((section) => {
      const sectionNodes = nodes.filter((n) => n.section === section.id)
      if (sectionNodes.length > 0) {
        mermaidGraph += `  subgraph ${section.id}["${section.title}"]\n`
        sectionNodes.forEach((node) => {
          mermaidGraph += renderNode(node, showComponentsBoolean, section.title)
        })
        mermaidGraph += '  end\n'
      }
    })

    // Add unassigned nodes
    const unassignedNodes = nodes.filter((n) => !n.section)
    unassignedNodes.forEach((node) => {
      mermaidGraph += renderNode(node, showComponentsBoolean)
    })

    let edgeCounter = 0
    // Add links to Mermaid graph
    links.forEach((link) => {
      const edgeId = 'edge' + edgeCounter++
      if (link.type === 'conditional') {
        mermaidGraph += `  ${link.source} ${edgeId}@-- "${link.label}" --> ${link.target}\n${edgeId}@{ animate: true }\n`
      } else {
        mermaidGraph += `  ${link.source} ${edgeId}@-.-> ${link.target}\n${edgeId}@{ animate: true }\n`
      }
    })

    // Add styling
    nodes.forEach((node) => {
      if (node.terminal) {
        mermaidGraph += `  style ${node.id} fill:#f8d7da,stroke:#dc3545\n`
      } else if (node.condition) {
        mermaidGraph += `  style ${node.id} fill:#fff9c4,stroke:#fbc02d\n`
      }
    })

    // Add click handlers for tooltips
    nodes.forEach((node) => {
      mermaidGraph += `    click ${node.id} noop\n`
    })

    return h.view('visualise-journey/index', {
      pageTitle: 'Visualise Journey',
      configName: config.name,
      mermaidGraph,
      showComponents: showComponentsBoolean,
      bucket,
      filename,
      tooltipData
    })
  }
}

const createTooltipData = (node, sectionTitle, lists) => {
  let ttd = ''
  if (sectionTitle) {
    ttd = `<span class="govuk-caption-l">${sectionTitle}</span>`
  }
  ttd += `<h1 class="govuk-heading-l">${node.title}</h1></br>`

  if (node.config?.topSection) {
    ttd += node.config.topSection
  }

  for (const component of node.components) {
    if (component.type === 'Html') {
      ttd += component.content
    } else if (component.type === 'YesNoField' || component.type === 'RadiosField') {
      ttd += `<div class="govuk-form-group">
                    <fieldset class="govuk-fieldset">
                      <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
                          ${node.components.length === 1 ? (component.hint ? '<h2 class="govuk-hint">' + component.hint : '') : '<h2 class="govuk-fieldset__heading">' + component.title}
                        </h2>
                      </legend>
                      <div class="govuk-radios" data-module="govuk-radios">
                        ${createRadioOptions(lists, component.type === 'YesNoField' ? 'yes-no' : component.list)}
                      </div>
                    </fieldset>
                  </div>`
    } else if (component.type === 'List') {
      ttd += `<div class="govuk-form-group">
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
    } else if (
      component.type === 'TextField' ||
      component.type === 'NumberField' ||
      component.type === 'NationalGridFieldNumberField' ||
      component.type === 'AutocompleteField' ||
      component.type === 'EmailAddressField' ||
      component.type === 'TelephoneNumberField' ||
      component.type === 'UkAddressField'
    ) {
      ttd += `<div class="govuk-form-group">
                    ${createLabellingForTextField(component, node.components.length)}
                    <input class="govuk-input govuk-!-width-two-thirds" id="textField" name="textField" type="text"
                    ${component.type === 'UkAddressField' ? `value="Address Field - multiple fields will be shown on real UI"` : ''}>
                  </div>`
    } else if (component.type === 'MultilineTextField') {
      ttd += `<div class="govuk-form-group">
                    ${createLabellingForTextField(component, node.components.length)}
                    <textarea class="govuk-textarea govuk-js-character-count" id="textField" name="textField" rows="${component.options?.rows ?? 10}"></textarea>
                    <div class="govuk-hint govuk-character-count__message govuk-character-count__status" aria-hidden="true">You have ${component.options?.maxWords ?? 0} words remaining</div>
                  </div>`
    } else if (component.type === 'DatePartsField' || component.type === 'MonthYearField') {
      ttd += `<div class="govuk-form-group">
                    ${createLabellingForTextField(component, node.components.length)}
                    <div class="govuk-date-input" autocomplete="off" id="datePartsField">
                      ${component.type === 'DatePartsField' ? getDateFieldInput('day') : ''}
                      ${getDateFieldInput('month')}
                      ${getDateFieldInput('year')}
                    </div>
                  </div>`
    } else if (component.type === 'CheckboxesField') {
      ttd += `<div class="govuk-form-group">
                    <fieldset class="govuk-fieldset">
                      <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
                          ${node.components.length === 1 ? (component.hint ? '<h2 class="govuk-hint">' + component.hint : '') : '<h2 class="govuk-fieldset__heading">' + component.title}
                        </h2>
                      </legend>
                      <div class="govuk-checkboxes" data-module="govuk-checkboxes">
                        ${createCbOptions(lists, component.list)}
                      </div>
                    </fieldset>
                  </div>`
    } else if (component.type === 'SelectField') {
      ttd += `<div class="govuk-form-group">
                      <label class="govuk-label govuk-label--m" for="selectField">${component.title}</label>
                      <select class="govuk-select" id="selectField" name="selectField">
                        ${createSelectOptions(lists, component.list)}
                      </select>
                  </div>`
    } else if (component.type === 'Details' || component.type === 'Markdown' || component.type === 'InsetText') {
      //these should be collapsible, inset, markdown etc but for now just show the content
      ttd += component.content
    } else {
      ttd += `<h2>${component.title}</h2>`
    }

    if (
      component.type !== 'Html' &&
      component.type !== 'Details' &&
      component.type !== 'Markdown' &&
      component.type !== 'InsetText'
    ) {
      ttd += `<p><small><strong>Name:</strong></small> <small>${component.name}</small></p>`
    }
  }

  if (!node.components?.length) {
    ttd += `<p><strong>No configurable components</strong></p>`
    ttd += getControllerSpecificMessage(node)
  } else if (!node.terminal) {
    ttd += getContinueButton(node)
  }
  return ttd
}

const getValue = (conditionItem, lists) => {
  if (conditionItem.type === 'ListItemRef') {
    const list = lists.find((l) => l.id === conditionItem.value.listId)
    return list.items.find((item) => item.id === conditionItem.value.itemId).text
  }
  return conditionItem.value
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

const getControllerSpecificMessage = (node) => {
  switch (node.controller) {
    case 'CheckDetailsController':
      return '<p>CheckDetailsController provides person/business details and selector to indicate if correct or not</p>'
    case 'TaskListPageController':
      return '<p>TaskListPageController provides a task list page showing user progress</p>'
    case 'CheckResponsesPageController':
      return '<p>CheckResponsesPageController provides a check of answers supplied</p>'
    case 'PaymentPageController':
      return node.config?.paymentExplanation
    case 'DeclarationPageController':
      return '<p>DeclarationPageController provides a declaration page for users to confirm their information</p>'
    default:
      return ''
  }
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

const componentsAsListItems = (components) => {
  if (components.length === 0) {
    return 'No components'
  }
  return components.map((component) => `<li><strong>${component.title}</strong>: ${component.type}</li>`).join('')
}

const createLabellingForTextField = (component, componentsLength) => {
  //if this is only component then no need to show the title as already shown
  if (componentsLength === 1) {
    return component.hint ? `<label class="govuk-label" for="textField">${component.hint}</label>` : ''
  }

  return `<label class="govuk-label" for="textField">${component.title}</label>${component.hint ? `<div id="text-hint" class="govuk-hint">${component.hint}</div>` : ''}`
}
