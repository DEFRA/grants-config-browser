import { loadJsonFromS3 } from '../common/helpers/s3/s3-config-loader.js'
import { createCwTaskTooltipData } from './tooltip/cw-tooltip.js'

export const visualiseCwController = {
  async handler(request, h) {
    const { config, bucket, filename, grant, version, errorResponse } = await loadJsonFromS3(request, h)
    if (errorResponse) {
      return errorResponse
    }

    const phases = config.phases || []
    const nodes = []
    const links = []
    const tooltipData = {}

    phases.forEach((phase) => {
      const stages = phase.stages || []
      stages.forEach((stage) => {
        generateStatusNodes(stage.statuses, nodes, links, tooltipData, phase, stage)
        generateTaskNodes(stage, nodes, links, tooltipData, phase)
      })
    })

    // Prepare Mermaid graph definition
    let mermaidGraph = 'flowchart LR\n'

    const renderNode = (node) => {
      const shapeStart = node.type === 'task' ? '[[' : '["'
      const shapeEnd = node.type === 'task' ? ']]' : '"]'
      return `        ${node.nodeId}${shapeStart}${node.name}${shapeEnd}\n`
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
      mermaidGraph += `  ${source} ${link.type === 'task-link' ? '-.->' : '-->'}${label} ${target}\n`
    })

    // Add styling
    nodes.forEach((node) => {
      if (node.type === 'task') {
        mermaidGraph += `  style ${node.nodeId} fill:#e7f3ff,stroke:#005ea5,stroke-width:2px\n`
      }
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
      stageName: stage.name,
      type: 'status'
    })

    createTooltipData(nodeId, tooltipData, phase, stage, status)

    // Check for tasks inside status (if any)
    if (status.taskGroups) {
      status.taskGroups.forEach((tg) => {
        tg.tasks?.forEach((task) => {
          const taskFullId = `${fullId}:${task.code}`
          const taskNodeId = taskFullId.replaceAll(':', '_')
          nodes.push({
            id: taskFullId,
            nodeId: taskNodeId,
            code: task.code,
            name: task.name,
            phase: phase.code,
            stage: stage.code,
            type: 'task'
          })
          tooltipData[taskNodeId] = createCwTaskTooltipData(task, phase, stage)
          links.push({
            source: fullId,
            target: taskFullId,
            type: 'task-link'
          })
        })
      })
    }

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

const generateTaskNodes = (stage, nodes, links, tooltipData, phase) => {
  if (stage.taskGroups) {
    stage.taskGroups.forEach((tg) => {
      tg.tasks?.forEach((task) => {
        const taskFullId = `${phase.code}:${stage.code}:${task.code}`
        const taskNodeId = taskFullId.replaceAll(':', '_')

        // Avoid duplicates if already added via status (though in cw.json they are at stage level)
        if (!nodes.some((n) => n.id === taskFullId)) {
          nodes.push({
            id: taskFullId,
            nodeId: taskNodeId,
            code: task.code,
            name: task.name,
            phase: phase.code,
            stage: stage.code,
            type: 'task'
          })
          tooltipData[taskNodeId] = createCwTaskTooltipData(task, phase, stage)

          // Link from all interactive statuses in this stage to this task
          const stageStatuses = stage.statuses || []
          stageStatuses.forEach((status) => {
            const statusFullId = `${phase.code}:${stage.code}:${status.code}`
            links.push({
              source: statusFullId,
              target: taskFullId,
              type: 'task-link'
            })
          })
        }
      })
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
      text: `Visualise CW config - ${filename}`
    }
  ]
}

const createTooltipData = (nodeId, tooltipData, phase, stage, status) => {
  let tasksHtml = ''
  if (stage.taskGroups && stage.taskGroups.length > 0) {
    stage.taskGroups.forEach((tg) => {
      if (tg.tasks && tg.tasks.length > 0) {
        tasksHtml += `<div class="govuk-!-margin-top-4">
          <strong class="govuk-body">${tg.name}:</strong>
          <ul class="govuk-list govuk-list--bullet govuk-body">`
        tg.tasks.forEach((t) => {
          tasksHtml += `<li>${t.name} (${t.mandatory ? 'Mandatory' : 'Optional'})</li>`
        })
        tasksHtml += `</ul></div>`
      }
    })
  }

  const statusName = status.name || status.code.replace('STATUS_', '').replaceAll('_', ' ')

  tooltipData[nodeId] = `
            <span class="govuk-caption-m">${phase.name} - ${stage.name}</span>
            <h2 class="govuk-heading-m govuk-!-margin-bottom-2">${statusName}</h2>
            <p class="govuk-body govuk-!-margin-bottom-0"><strong>Phase:</strong> ${phase.code}</p>
            <p class="govuk-body govuk-!-margin-bottom-0"><strong>Stage:</strong> ${stage.code}</p>
            <p class="govuk-body govuk-!-margin-bottom-0"><strong>Status:</strong> ${status.code}</p>
            ${tasksHtml}
          `.trim()
}
