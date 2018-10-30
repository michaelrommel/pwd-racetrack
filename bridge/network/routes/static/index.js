module.exports = (server, plugins) => {
  server.get('/display/*', plugins.serveStatic({
    directory: './network/routes/static',
    default: 'live.html'
  }))
}
