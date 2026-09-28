import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'
import { statusCodes } from '../common/constants/status-codes.js'

export const visualiseCwController = {
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
    const nodes = []
    const links = []
    const tooltipData = {}

    phases.forEach((phase) => {
      const stages = phase.stages || []
      stages.forEach((stage) => {
        generateStatusNodes(stage.statuses, nodes, links, tooltipData, phase, stage)
      })
    })

    // Prepare Mermaid graph definition
    let mermaidGraph = 'flowchart LR\n'

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
      const label = link.action ? `|${link.action}|` : ''
      mermaidGraph += `  ${source} -->${label} ${target}\n`
    })

    // Add click handlers for tooltips
    nodes.forEach((node) => {
      mermaidGraph += `  click ${node.nodeId} noop\n`
    })

    return h.view('visualise-cw/index', {
      pageTitle: 'Visualise CW',
      configName: config.code,
      mermaidGraph,
      bucket,
      filename,
      tooltipData,
      breadcrumbs: createBreadCrumbs(filename, grant, version)
    })
  }
}

const generateStatusNodes = (statuses, nodes, links, tooltipData, phase, stage) => {
  statuses?.forEach((status) => {
    const fullId = `${phase.code}:${stage.code}:${status.code}`
    const nodeId = fullId.replaceAll(':', '_')
    nodes.push({
      id: fullId,
      nodeId,
      code: status.code,
      name: status.name || status.code.replace('STATUS_', '').replaceAll('_', ' '),
      phase: phase.code,
      stage: stage.code,
      stageName: stage.name
    })

    createTooltipData(nodeId, tooltipData, phase, stage, status)

    const transitions = status.transitions || []
    transitions.forEach((transition) => {
      if (transition.targetPosition) {
        links.push({
          source: fullId,
          target: transition.targetPosition,
          action: transition.action?.name || ''
        })
      }
    })
  })
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
      text: `Visualise CW config - ${filename}`
    }
  ]
}

const createTooltipData = (nodeId, tooltipData, phase, stage, status) => {
  let tasksHtml = ''
  if (stage.taskGroups && stage.taskGroups.length > 0) {
    stage.taskGroups.forEach((tg) => {
      if (tg.tasks && tg.tasks.length > 0) {
        tasksHtml += `<br/><strong>${tg.name}:</strong><ul>`
        tg.tasks.forEach((t) => {
          tasksHtml += `<li>${t.name} (${t.mandatory ? 'Mandatory' : 'Optional'})</li>`
        })
        tasksHtml += `</ul>`
      }
    })
  }

  tooltipData[nodeId] = `
            <strong>Phase:</strong> ${phase.name} (${phase.code})<br/>
            <strong>Stage:</strong> ${stage.name} (${stage.code})<br/>
            <strong>Status:</strong> ${status.name || status.code} (${status.code})
            ${tasksHtml}
          `.trim()
}
