module.exports = (ctx) => {
  require('./admin')(ctx.server, ctx.db)
  require('./auth')(ctx.server, ctx.db)
  require('./car')(ctx.server, ctx.db)
  require('./heat')(ctx.server, ctx.db, ctx.serial)
  require('./ping')(ctx.server)
  require('./race')(ctx.server, ctx.db, ctx.serial)
  require('./track')(ctx.server, ctx.db, ctx.serial)
  require('./raceconfig')(ctx.server, ctx.db)
  require('./user')(ctx.server, ctx.db)
  require('./static')(ctx.server, ctx.plugins)
  require('./websocket')(ctx.server, ctx.ws)
}
