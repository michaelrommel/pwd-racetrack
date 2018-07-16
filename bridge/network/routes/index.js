module.exports = (ctx) => {
  require('./admin')(ctx.server)
  require('./car')(ctx.server, ctx.db)
  require('./heat')(ctx.server, ctx.db, ctx.serial)
  require('./ping')(ctx.server)
  require('./race')(ctx.server, ctx.db, ctx.serial)
  require('./raceconfig')(ctx.server, ctx.db)
  require('./user')(ctx.server, ctx.db)
}
