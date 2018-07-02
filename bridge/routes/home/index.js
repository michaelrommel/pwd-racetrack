// just to demo a route with multiple versions
module.exports = (server, plugins) => {
  server.get('/home',
    plugins.conditionalHandler([
      {
        version: '1.0.0',
        handler: require('./v1')
      },
      {
        version: '2.0.0',
        handler: require('./v2')
      }
    ]))
}
