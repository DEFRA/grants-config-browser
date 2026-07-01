import fs from 'node:fs'
import yaml from 'js-yaml'
import { config as appConfig } from '../../config/config.js'
import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'

export const visualiseJourneyController = {
  async handler(request, h) {
    const { bucket, filename } = request.query || {}
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

    console.log(conditionsList)

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
    pages.forEach((page, index) => {
      // If it's a terminal page, it has no next links
      if (page.terminal || page.controller?.includes('Terminal')) {
        return
      }

      // Check the NEXT page in the list to see if it's conditional
      const nextPageIndex = index + 1
      const nextPage = pages[nextPageIndex]

      if (nextPage) {
        if (nextPage.condition) {
          // If the next page is conditional, we add two links from the CURRENT page
          // 1. To the nextPage if the condition is true
          const condition = conditionsList.find((c) => c.id === nextPage.condition)
          const component = page.components?.find((c) => c.id === condition.items[0]?.componentId)
          // console.log(condition, component)
          const label = condition
            ? component.shortDescription +
              ' ' +
              condition.items[0]?.operator +
              ' ' +
              getValue(condition.items[0], lists)
            : ''

          links.push({
            source: page.id,
            target: nextPage.id,
            type: 'conditional',
            label
          })

          // 2. To the page AFTER nextPage if the condition is false (if it exists)
          const pageAfterNext = pages[nextPageIndex + 1]
          if (pageAfterNext) {
            links.push({
              source: page.id,
              target: pageAfterNext.id,
              type: 'default' // Default path if condition is false
            })
          }
        } else {
          // If the next page is NOT conditional, just link to it
          links.push({
            source: page.id,
            target: nextPage.id,
            type: 'default'
          })
        }
      }
    })

    // Prepare Mermaid graph definition
    let mermaidGraph = 'flowchart TD\n'

    const renderNode = (node) => {
      const title = node.terminal ? `🚩 ${node.title}` : node.title
      const shapeStart = node.terminal ? '((' : '['
      const shapeEnd = node.terminal ? '))' : ']'
      return `    ${node.id}${shapeStart}"${title}<br/><small>${node.path}</small>"${shapeEnd}\n`
    }

    // Group nodes by section for Mermaid subgraphs
    sections.forEach((section) => {
      const sectionNodes = nodes.filter((n) => n.section === section.id)
      if (sectionNodes.length > 0) {
        mermaidGraph += `  subgraph ${section.id}["${section.title}"]\n`
        sectionNodes.forEach((node) => {
          mermaidGraph += renderNode(node)
        })
        mermaidGraph += '  end\n'
      }
    })

    // Add unassigned nodes
    const unassignedNodes = nodes.filter((n) => !n.section)
    unassignedNodes.forEach((node) => {
      mermaidGraph += renderNode(node)
    })

    let edgeCounter = 0
    // Add links to Mermaid graph
    links.forEach((link) => {
      const edgeId = 'edge' + edgeCounter++
      if (link.type === 'conditional') {
        mermaidGraph += `  ${link.source} -- "${link.label}" --> ${link.target}\n`
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
      mermaidGraph
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
