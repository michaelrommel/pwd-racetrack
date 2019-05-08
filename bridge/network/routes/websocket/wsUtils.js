const MODULE_ID = 'wsUtils'
const logger = require('../../../utils/logger')

let shed

function setContext (wshed) {
  shed = wshed
}

function notify () {
  shed.send('test')
}

module.exports = {
  notify: notify,
  setContext: setContext
}
