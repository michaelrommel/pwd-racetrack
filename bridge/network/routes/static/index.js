module.exports = (server, plugins) => {
  server.get('/display/*', plugins.serveStatic({
    directory: './network/routes/static',
    default: 'live.html'
  }))
  server.get('/manager/*', plugins.serveStatic({
    directory: './network/routes/static',
    default: 'index.html'
  }))
  server.get('/favicon.ico', plugins.serveStatic({
    directory: './network/routes/static',
    default: 'favicon.ico'
  }))
}
