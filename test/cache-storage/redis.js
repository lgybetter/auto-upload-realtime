'use strict';
const uuid = require('uuid');
const cache = require('../../cache-storage/redis');
const assert = require('assert');
const co = require('co');

let roomId = uuid.v4();



let msgIds = [];
let scores = [];
let messages = null;
let insertTotal = 400;
describe("cache-storage/redis", function(){

    it(`save ${insertTotal} message`, function(done){
      co(function*(){
        for(let i= 0;i<insertTotal;i++){
          let title = uuid.v4();
          let content = uuid.v4();
          let message = {title, content};
          let ret = yield cache.save(roomId, message);

          //console.log(ret);
          assert(ret.roomId.indexOf(roomId)===0);
          assert(ret.message.title===title);
          assert(ret.message.content===content);

          msgIds.push(ret.msgId);

        }
        //console.log(msgIds);
        assert(msgIds.length===insertTotal);
      }).then(done, done);

    });

  it('findAll', function(done){
    cache.findAll(roomId).then((msgs) => {
      messages = msgs;
      //console.log(msgs);
      for(let index in msgs){
        let msg = msgs[index];
        scores.push(msg.score);
        assert(msg.roomId.indexOf(roomId)===0);
      }
      scores = scores.sort();
      msgIds = msgIds.sort();
      for(let index in scores){
        assert(scores[index] === msgIds[index]);
      }
    }).then(done, done);
  });

  it("remove one by one", function(done){
    co(function*(){
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