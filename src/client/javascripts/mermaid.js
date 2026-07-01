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
    const viewBox = svg.getAttribute('viewBox')
    if (!viewBox) {
      return
    }

    const [, , , height] = viewBox.split(' ')
    const { width } = svg.parentElement.getBoundingClientRect()

    const panZoom = svgPanZoom(svg, {
      controlIconsEnabled: false,
      mouseWheelZoomEnabled: true,
      zoomScaleSensitivity: 1,
      minZoom: 0.2,
      maxZoom: 20
    })

    const resetZoomButton = document.getElementById('reset-zoom')
    if (resetZoomButton) {
      resetZoomButton.addEventListener('click', () => {
        panZoom.resetZoom()
        panZoom.center()
      })
    }

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    svg.style.maxWidth = `${width}px`
    svg.style.width = '100%'
    svg.style.height = '100%'
  })
}

run()
