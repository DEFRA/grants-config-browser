import fs from 'node:fs'
import { config as appConfig } from '../../config/config.js'
import { getS3FileContent } from '../common/helpers/s3/s3-interactions.js'

export const visualiseGasController = {
  async handler(request, h) {
    const { bucket, filename } = request.query || {}
    const jsonPath = appConfig.get('visualiseGas.jsonPath')

    let config
    try {
      let fileContent
      if (bucket && filename) {
        fileContent = await getS3FileContent(bucket, filename)
      } else {
        fileContent = fs.readFileSync(jsonPath, 'utf8')
      }
      config = JSON.parse(fileContent)
    } catch (e) {
      return h.response(`Error loading JSON: ${e.message}`).code(500)
    }

    const phases = config.phases || []

    const nodes = []
    const links = []

    phases.forEach((phase) => {
      const stages = phase.stages || []
      stages.forEach((stage) => {
        const statuses = stage.statuses || []
        statuses.forEach((status) => {
          const fullId = `${phase.code}:${stage.code}:${status.code}`
          nodes.push({
            id: fullId,
            code: status.code,
            name: status.code.replace('STATUS_', '').replace(/_/g, ' '),
            phase: phase.code,
            stage: stage.code,
            stageName: stage.name
          })

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
        })
      })
    })

    // Prepare Mermaid graph definition
    let mermaidGraph = 'flowchart TD\n'

    const renderNode = (node) => {
      return `        ${node.id.replace(/:/g, '_')}["${node.name}"]\n`
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
      const source = link.source.replace(/:/g, '_')
      const target = link.target.replace(/:/g, '_')
      const label = link.processes.length > 0 ? `|${link.processes.join(', ')}|` : ''
      mermaidGraph += `  ${source} -->${label} ${target}\n`
    })

    return h.view('visualise-gas/index', {
      pageTitle: 'Visualise GAS',
      configName: config.metadata?.description || config.code,
      mermaidGraph,
      bucket,
      filename
    })
  }
}
