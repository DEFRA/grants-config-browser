import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'
import { statusCodes } from '../common/constants/status-codes.js'

export const visualiseGasController = {
  async handler(request, h) {
    const { bucket, filename, grant, version } = request.query || {}

    let config
    try {
      let fileContent
      if (bucket && filename) {
        fileContent = await getS3FileContent(bucket, filename)
      } else {
        throw new Error('No bucket or filename provided')
      }
      config = JSON.parse(fileContent)
    } catch (e) {
      return h.response(`Error loading JSON: ${e.message}`).code(statusCodes.internalServerError)
    }

    const phases = config.phases || []
    // const externalStatusMap = config.externalStatusMap || []

    const nodes = []
    const links = []
    const tooltipData = {}

    phases.forEach((phase) => {
      const stages = phase.stages || []
      stages.forEach((stage) => {
        const statuses = stage.statuses || []
        statuses.forEach((status) => {
          const fullId = `${phase.code}:${stage.code}:${status.code}`
          const nodeId = fullId.replaceAll(':', '_')
          nodes.push({
            id: fullId,
            nodeId,
            code: status.code,
            name: status.code.replace('STATUS_', '').replaceAll('_', ' '),
            phase: phase.code,
            stage: stage.code,
            stageName: stage.name
          })

          createTooltipData(nodeId, tooltipData, phase, stage, status)
          createLinks(phase, stage, status, fullId, links)
        })
      })
    })

    // Prepare Mermaid graph definition
    let mermaidGraph = 'flowchart TD\n'

    const renderNode = (node) => {
      return `        ${node.nodeId}["${node.name}"]\n`
    }

    // Group by Phase and Stage
    phases.forEach((phase) => {
      mermaidGraph += `  subgraph ${phase.code}["${phase.name}"]\n`
      const stages = phase.stages || []
      stages.forEach((stage) => {
        mermaidGraph += `    subgraph ${phase.code}_${stage.code}["${stage.name}"]\n`
        const stageNodes = nodes.filter((n) => n.phase === phase.code && n.stage === stage.code)
        stageNodes.forEach((node) => {
          mermaidGraph += renderNode(node)
        })
        mermaidGraph += '    end\n'
      })
      mermaidGraph += '  end\n'
    })

    // Add links to Mermaid graph
    links.forEach((link) => {
      const source = link.source.replaceAll(':', '_')
      const target = link.target.replaceAll(':', '_')
      const label = link.processes.length > 0 ? `|${link.processes.join(', ')}|` : ''
      mermaidGraph += `  ${source} -->${label} ${target}\n`
    })

    // Add click handlers for tooltips
    nodes.forEach((node) => {
      mermaidGraph += `  click ${node.nodeId} noop\n`
    })

    return h.view('visualise-gas/index', {
      pageTitle: 'Visualise GAS',
      configName: config.metadata?.description || config.code,
      mermaidGraph,
      bucket,
      filename,
      tooltipData,
      breadcrumbs: createBreadCrumbs(filename, grant, version)
    })
  }
}

const createBreadCrumbs = (filename, grant, version) => {
  return [
    {
      text: 'Home',
      href: '/'
    },
    {
      text: grant,
      href: `/grant?grant=${grant}`
    },
    {
      text: version,
      href: `/version?grant=${grant}&version=${version}`
    },
    {
      text: `Visualise GAS config - ${filename}`
    }
  ]
}

const createTooltipData = (nodeId, tooltipData, phase, stage, status) => {
  tooltipData[nodeId] = `
            <strong>Phase:</strong> ${phase.name} (${phase.code})<br/>
            <strong>Stage:</strong> ${stage.name} (${stage.code})<br/>
            <strong>Status:</strong> ${status.code}
          `.trim()
}

const createLinks = (phase, stage, status, fullId, links) => {
  const validFrom = status.validFrom || []
  validFrom.forEach((vf) => {
    let sourceId = vf.code
    if (!sourceId.includes(':')) {
      // If it's a short code, assume it's in the same stage
      sourceId = `${phase.code}:${stage.code}:${vf.code}`
    }
    links.push({
      source: sourceId,
      target: fullId,
      processes: vf.processes || []
    })
  })
}
