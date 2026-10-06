const http = require('http')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Dev-only: forwards /api/mobile/** through Metro's own dev server to the
// Next.js bridge on localhost:3000. This lets the mobile app reach both
// Metro and the bridge through the SAME tunnel URL when testing over Expo's
// `--tunnel` mode, where the phone and this machine aren't on the same
// network and only Metro's port gets a public tunnel.
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/api/mobile/')) {
        const proxyReq = http.request(
          { host: 'localhost', port: 3000, path: req.url, method: req.method, headers: req.headers },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
            proxyRes.pipe(res, { end: true })
          },
        )
        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Bridge unreachable: ' + err.message }))
        })
        req.pipe(proxyReq, { end: true })
        return
      }
      return metroMiddleware(req, res, next)
    }
  },
}

module.exports = withNativeWind(config, { input: './src/global.css' })
