import mermaid from 'mermaid'
import svgPanZoom from 'svg-pan-zoom'

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
        const pannedSizes = panZoom.getSizes()
        panZoom.pan({ x: pannedSizes.pan.x, y: 0 })
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
}

run()
