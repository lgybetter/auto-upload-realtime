const co = require('co')
const Promise = require('bluebird')
const cacheStorage = require('../../cache-storage/redis')
const authService = require('../../services/auth-service')

exports.init = io => {
  io.on('connection', socket => {
    /**
     * 客户端链接云端
     * @param {*} userInfo 用户信息
     *  name
     *  password
     */
    socket.on('join', ({ userInfo }) => {
      co(function*() {
        let body = yield authService.getUserInfo(userInfo)
        let roomId = body._id
        if(!body._id) {
          socket.disconnect('unauthorized')
        } else {
          socket.join(roomId)
          io.to(roomId).emit('joined', { message: 'join success', roomId })
          try {
            let msgs = yield cacheStorage.findAll(roomId)
            yield Promise.each(msgs, msg => {
              io.to(roomId).emit('message', { message: msg.message, msgId: msg.score, roomId: msg.roomId })
            })
          } catch (err) {
            console.log(err)          
          }
        }
      })
    })

    /**
     * 云端推送消息到客户端
     * @param {*} roomId 用户的Id
     * @param {*} message 需要推送的消息
     */
    socket.on('pushMessage', ({ roomId, message }, cb) => {
      co(function* () {
        try {
          // 每次只推送最新的代码push消息
          yield cacheStorage.remove(roomId)
          let msg = yield cacheStorage.save(roomId, message)
          io.to(roomId).emit('message', { message, msgId: msg.msgId, roomId: msg.roomId })
          if(typeof cb === "function")cb();
        } catch (err) {
          console.log(err)
          if(typeof cb === "function")cb(err);
        }

      })
    })

    /**
     * 云端推送广播消息给多个用户
     * @param {*} message 需要广播的消息
     */
    socket.on('broadcastMessage', ({ message }) => {
      co(function* () {
        socket.broadcast.emit('message', { message })
      })
    })

    /**
     * 用户收到消息后确认, redis移除该消息
     * @param {*} roomId 用户的Id
     * @param {*} msgId 已经收到的消息Id
     */
    socket.on('confirmRecept', ({ roomId, msgId }) => {
      co(function* () {
        try {
          let msgs = yield cacheStorage.removeOne(roomId, msgId)
        } catch (err) {
          console.log(err)          
        }
      })
    })
  })
}