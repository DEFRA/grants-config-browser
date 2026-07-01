import fs from 'node:fs'
import yaml from 'js-yaml'
import { config as appConfig } from '../../config/config.js'
import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'

export const visualiseJourneyController = {
  async handler(request, h) {
    const { bucket, filename, showComponents } = request.query || {}
    const showComponentsBoolean = showComponents === 'true'
    const yamlPath = appConfig.get('visualiseJourney.yamlPath')

    let config
    try {
      let fileContent
      if (bucket && filename) {
        fileContent = await getS3FileContent(bucket, filename)
      } else {
        fileContent = fs.readFileSync(yamlPath, 'utf8')
      }
      config = yaml.load(fileContent)
    } catch (e) {
      return h.response(`Error loading YAML: ${e.message}`).code(500)
    }

    const sections = config.sections || []
    const lists = config.lists || []
    const pages = config.pages || []
    const conditionsList = config.conditions || []

    // for each condition, see which page's component it links to
    conditionsList.forEach((condition) => {
      const componentId = condition.items[0]?.componentId
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
      components: (page.components || []).map((c) => ({
        type: c.type,
        title: c.title || c.name || 'Component',
        shortDescription: c.shortDescription,
        id: c.id
      }))
    }))

    // Build flow links
    const links = []

    const createConditionalLabelAndLink = (page, condition, nextPageId) => {
      const component = page.components?.find((c) => c.id === condition.items[0]?.componentId)

      const label =
        condition && component
          ? (component.shortDescription || component.title) +
            ' ' +
            condition.items[0]?.operator +
            ' ' +
            getValue(condition.items[0], lists)
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

    const componentsAsListItems = (components, listTags = true) => {
      return components.map((component) => `${listTags ? '<li>' : ''}${component.title} : ${component.type}${listTags ? '</li>' : ''}`).join(listTags ? '' : '\n')
    }

    const renderNode = (node, showComponents) => {
      const title = node.terminal ? `🚩 ${node.title}` : node.title
      const shapeStart = node.terminal ? '((' : '['
      const shapeEnd = node.terminal ? '))' : ']'
      const componentDetails = showComponents ? `<ul>${componentsAsListItems(node.components)}</ul>` : ''
      const toolTip = componentsAsListItems(node.components, false)
      const toolTipText = toolTip ? `click ${node.id} href "#" "${toolTip}"\n` : ''
      console.log(toolTip)
      return `    ${node.id}${shapeStart}"${title}<br/><small>${node.path}</small>${componentDetails}"${shapeEnd}\n${toolTipText}`
    }

    // Group nodes by section for Mermaid subgraphs
    sections.forEach((section) => {
      const sectionNodes = nodes.filter((n) => n.section === section.id)
      if (sectionNodes.length > 0) {
        mermaidGraph += `  subgraph ${section.id}["${section.title}"]\n`
        sectionNodes.forEach((node) => {
          mermaidGraph += renderNode(node, showComponentsBoolean)
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

    console.log(mermaidGraph)

    return h.view('visualise-journey/index', {
      pageTitle: 'Visualise Journey',
      configName: config.name,
      mermaidGraph,
      showComponents: showComponentsBoolean,
      bucket,
      filename
    })
  }
}


const getValue = (conditionItem, lists) => {
  if (conditionItem.type === 'ListItemRef') {
    const list = lists.find((l) => l.id === conditionItem.value.listId)
    return list.items.find(item => item.id === conditionItem.value.itemId).text
  }
  return conditionItem.value
}

