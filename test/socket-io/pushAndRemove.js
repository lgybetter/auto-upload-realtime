/**
 * Created by jiege on 17-4-8.
 */
'use strict';
const assert = require('assert');
const co = require('co');
const uuid = require('uuid');
const cache = require('../../cache-storage/redis');
const Promise = require('bluebird');
const socketIoClient = require('socket.io-client');
let client = null;
let wsUrl = "ws://localhost:6005";

let roomId = "testRoomId";
let pushTotal = 300;
function pushMessage(msg){
  return new Promise((resolve, reject) => {
    client.emit('pushMessage', msg, function(err){
      if(err){
        reject(err);
      }else{
        resolve();
      }
    });
  });
}
describe("socket-io/pushAndRemove", function(){
  it("connect", function(done){
    client = socketIoClient(wsUrl);
    client.on('connect', done);
  });
  it("pushMessage and remove from cache", function(done){
    co(function*(){
      for(let i=0;i<pushTotal;i++){
        yield pushMessage({roomId: roomId, message: {title: uuid.v4(), content: uuid.v4()}});
      }
      let messages = yield cache.findAll(roomId);
      assert(messages.length >= pushTotal);//考虑到队列里面可能还有遗留消息，所以查出来的消息数量要大于推送过去的消息数量
      //console.log(messages);
      for(let index in messages){
        let msg = messages[index];
        yield cache.removeOne(msg.roomId, msg.score);
        let restMsgs = yield cache.findAll(roomId);
        //console.log('restMsgs.length', restMsgs.length);
        assert(restMsgs.length === (messages.length-index-1));
      }
    }).then(done, done);
  });

});
