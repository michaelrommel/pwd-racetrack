module.exports = (ctx) => {
  require('./admin')(ctx.server)
  require('./car')(ctx.server, ctx.db)
  require('./heat')(ctx.server, ctx.serial, ctx.db)
  require('./ping')(ctx.server)
  require('./race')(ctx.server)
  require('./raceconfig')(ctx.server)
  require('./track')(ctx.server)
  require('./user')(ctx.server)
}
