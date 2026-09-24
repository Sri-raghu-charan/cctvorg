import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

function optimizeCesiumHtmlPlugin(): Plugin {
  return {
    name: 'optimize-cesium-html',
    enforce: 'post',
    transformIndexHtml(html) {
      let newHtml = html.replace('<script src="/cesium/Cesium.js"></script>', '');
      newHtml = newHtml.replace(
        '<link rel="stylesheet" href="/cesium/Widgets/widgets.css">',
        '<link rel="stylesheet" href="/cesium/Widgets/widgets.css" media="print" onload="this.media=\'all\'">'
      );
      newHtml = newHtml.replace(
        '</head>',
        '  <link rel="preload" as="script" href="/cesium/Cesium.js">\n  </head>'
      );
      newHtml = newHtml.replace(
        '</body>',
        '  <script defer src="/cesium/Cesium.js"></script>\n  </body>'
      );
      return newHtml;
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), (cesium as any)(), optimizeCesiumHtmlPlugin()],
})
