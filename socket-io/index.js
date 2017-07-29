const pushMessage = require('./models/push-message')

exports.socketIo = (server => {
  let io = require('socket.io')(server)
  pushMessage.init(io)
})