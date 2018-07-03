module.exports = (server, plugins) => {
  // unprotected routes
  require('./ping')(server)
  require('./register')(server)

  // protected routes
  require('./whoami')(server)
  require('./home')(server, plugins)
  require('./admin')(server)
}
