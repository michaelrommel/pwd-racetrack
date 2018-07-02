module.exports = (server) => {
  server.post({ path: '/register',
    version: '1.0.0' }, require('./v1'))
}
