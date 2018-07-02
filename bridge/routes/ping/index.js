module.exports = (server) => {
  server.get({ path: '/ping',
    version: '1.0.0' }, require('./v1'))
}
