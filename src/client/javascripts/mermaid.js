import mermaid from 'mermaid'
import svgPanZoom from 'svg-pan-zoom'
import tippy from 'tippy.js'

window.noop = () => {} // Used when defining tooltips

mermaid.initialize({
  startOnLoad: false,
  logLevel: 'error',
  securityLevel: 'loose',
  theme: 'base',
  themeVariables: {
    lineColor: '#0b0c0c',
    primaryColor: '#bbd4e6',
    primaryTextColor: '#0b0c0c',
    primaryBorderColor: '#d2e2f1',
    secondaryColor: '#F5F5F5',
    secondaryBorderColor: '#d2e2f1',
    tertiaryColor: '#f4f8fb',
    tertiaryBorderColor: '#d2e2f1'
  },
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis'
  }
})

async function run() {
  const tooltipDataElement = document.getElementById('tooltip-data')
  const tooltipData = tooltipDataElement ? JSON.parse(tooltipDataElement.textContent) : {}

  await mermaid.run()

  document.querySelectorAll('pre.mermaid').forEach((pre) => {
    pre.style.visibility = 'visible'
  })

  document.querySelectorAll('pre.mermaid--pan-zoom > svg').forEach((svg) => {
    if (!svg.getAttribute('viewBox')) {
      return
    }

    const panZoom = svgPanZoom(svg, {
      controlIconsEnabled: false,
      mouseWheelZoomEnabled: true,
      zoomScaleSensitivity: 0.2,
      minZoom: 0.01,
      maxZoom: 100,
      fit: true,
      center: true
    })

    const smartZoom = () => {
      panZoom.fit()
      panZoom.center()

      const sizes = panZoom.getSizes()
      const containerRatio = sizes.width / sizes.height
      const graphRatio = sizes.viewBox.width / sizes.viewBox.height

      // If the graph is much taller than the container ratio, fit to width instead of height
      if (graphRatio < containerRatio) {
        const newZoom = sizes.width / sizes.viewBox.width
        panZoom.zoom(newZoom)
        panZoom.center()
        const currentPan = panZoom.getPan()
        panZoom.pan({ x: currentPan.x, y: 0 })
      }
    }

    smartZoom()

    const resetZoomButton = document.getElementById('reset-zoom')
    if (resetZoomButton) {
      resetZoomButton.addEventListener('click', (e) => {
        e.preventDefault()
        smartZoom()
      })
    }
  })

  tippy('.node', {
    content: (reference) => {
      let id = reference.id

      // Mermaid v11 might put the ID on a child or parent
      if (!id) {
        const withId = reference.querySelector('[id]')
        if (withId) {
          id = withId.id
        }
      }

      if (!id && reference.parentElement?.id) {
        id = reference.parentElement.id
      }

      if (!id || !tooltipData) {
        return null
      }

      if (tooltipData[id]) {
        return tooltipData[id]
      }

      // Mermaid sometimes uses ids like flowchart-nodeId-index
      const keys = Object.keys(tooltipData)
      // Sort keys by length descending to match the longest (most specific) key first
      const sortedKeys = keys.sort((a, b) => b.length - a.length)

      const matchingKey = sortedKeys.find((key) => {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(^|[-])${escapedKey}([-]|$)`)
        return regex.test(id)
      })

      return matchingKey ? tooltipData[matchingKey] : null
    },
    allowHTML: true,
    interactive: true,
    placement: 'top-end',
    theme: 'white-bg',
    maxWidth: 800,
    appendTo: () => document.body
  })
}

run()
