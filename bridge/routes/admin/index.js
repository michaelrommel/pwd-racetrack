module.exports = (server) => {
  server.get({ path: '/admin',
    version: '1.0.0' }, require('./v1'))
}
