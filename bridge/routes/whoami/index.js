module.exports = (server) => {
  server.get({ path: '/whoami',
    version: '1.0.0' }, require('./v1'))
}
