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
  const containers = document.querySelectorAll('.journey-visualisation-container')

  containers.forEach((container) => {
    // Show all children (Mermaid v11 replaces the pre tag with an svg or div)
    Array.from(container.children).forEach((el) => {
      el.style.visibility = 'visible'
    })

    if (container.classList.contains('mermaid--pan-zoom')) {
      const svg = container.querySelector('svg')
      if (!svg?.getAttribute('viewBox')) {
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
        panZoom.resize()
        panZoom.fit()
        panZoom.center()
      }

      smartZoom()

      const resetZoomButton = document.getElementById('reset-zoom')
      if (resetZoomButton) {
        resetZoomButton.addEventListener('click', (e) => {
          e.preventDefault()
          smartZoom()
        })
      }
    }

    tippy(container.querySelectorAll('.node'), {
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
        const sortedKeys = keys.toSorted((a, b) => b.length - a.length)

        const matchingKey = sortedKeys.find((key) => {
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
          const regex = new RegExp(`(^|[-])${escapedKey}([-]|$)`)
          return regex.test(id)
        })

        return matchingKey ? tooltipData[matchingKey] : null
      },
      allowHTML: true,
      interactive: true,
      placement: 'left',
      theme: `white-bg ${container.dataset.type === 'cw' ? 'cw-tooltip' : ''}`,
      maxWidth: 800,
      appendTo: () => document.body
    })
  })
}

await run()
