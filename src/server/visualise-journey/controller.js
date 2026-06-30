import fs from 'node:fs'
import yaml from 'js-yaml'
import { config as appConfig } from '../../config/config.js'

export const visualiseJourneyController = {
  async handler(request, h) {
    const yamlPath = appConfig.get('visualiseJourney.yamlPath')

    let config
    try {
      const fileContent = fs.readFileSync(yamlPath, 'utf8')
      config = yaml.load(fileContent)
    } catch (e) {
      return h.response(`Error loading YAML: ${e.message}`).code(500)
    }

    const sections = config.sections || []
    const pages = config.pages || []
    // const conditions = config.conditions || []

    // Helper to find a page by ID
    // const findPageById = (id) => pages.find((p) => p.id === id)

    const nodes = pages.map((page) => ({
      id: page.id,
      title: page.title,
      path: page.path,
      section: page.section,
      controller: page.controller,
      condition: page.condition,
      components: (page.components || []).map((c) => ({
        type: c.type,
        title: c.title || c.name || 'Component',
        id: c.id
      }))
    }))

    // Build flow links
    const links = []
    pages.forEach((page, index) => {
      // If there's a next page in the list, it's the default flow
      if (index < pages.length - 1) {
        links.push({
          source: page.id,
          target: pages[index + 1].id,
          type: 'default'
        })
      }
    })

    // Prepare Mermaid graph definition
    let mermaidGraph = 'flowchart TD\n'

    // Group nodes by section for Mermaid subgraphs
    sections.forEach((section) => {
      const sectionNodes = nodes.filter((n) => n.section === section.id)
      if (sectionNodes.length > 0) {
        mermaidGraph += `  subgraph ${section.id}["${section.title}"]\n`
        sectionNodes.forEach((node) => {
          mermaidGraph += `    ${node.id}["${node.title}<br/><small>${node.path}</small>"]\n`
        })
        mermaidGraph += '  end\n'
      }
    })

    // Add unassigned nodes
    const unassignedNodes = nodes.filter((n) => !n.section)
    unassignedNodes.forEach((node) => {
      mermaidGraph += `  ${node.id}["${node.title}<br/><small>${node.path}</small>"]\n`
    })

    // Add links to Mermaid graph
    links.forEach((link) => {
      mermaidGraph += `  ${link.source} --> ${link.target}\n`
    })

    // Add styling/interactivity
    nodes.forEach((node) => {
      if (node.condition) {
        mermaidGraph += `  style ${node.id} fill:#fff9c4,stroke:#fbc02d\n`
      }
    })

    return h.view('visualise-journey/index', {
      pageTitle: 'Visualise Journey',
      configName: config.name,
      mermaidGraph
    })
  }
}
