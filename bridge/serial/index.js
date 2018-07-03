var port1 = new SerialPort('COM7',
  { 'baudRate': 57600,
    'dataBits': 8,
    'parity': 'none',
    'stopBits': 1
  },
  function (err) {
    if (err) {
      logger.info('Error opening: %s', err.message)
    }
  }
)


port1.on('readable', function () {
  let newdata = port1.read().toString('utf8')
  logger.info('got serial data: %s', newdata)

  try {
 
    data = JSON.parse(newdata)
  } catch (err) {
    logger.error('Error parsing input data to JSON obj: %s', err.message)
    // end ??
  }

  message_id = data.id
  message_cc = data.c

  if message_cc == "p"
  logger.debug('JSON data: %s', data.id)

  // show all key-value pairs
  heatdb.createReadStream()
    .on('data', function (data) {
      logger.info('Key=%s, Value=%s', data.key, data.value)
    })
    .on('error', function (err) {
      logger.info('Error while reading db stream: %s!', err)
    })
    .on('close', function () {
      logger.info('DB stream closed')
    })
    .on('end', function () {
      logger.info('Stream ended')
    })
})
