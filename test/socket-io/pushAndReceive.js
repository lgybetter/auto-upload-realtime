const assert = require('assert');
const request = require('request');
const rq = require('request-promise');
const nconf = require('../../nconf');
const uuid = require('uuid');
const co = require('co');
const Promise = require('bluebird');
const socketIoClient = require('socket.io-client');

let username = "15915835889";
let password = "jiegewifi123";

let token = null;
let roomId = null;

let wsUrl = "ws://localhost:5001";
let client = null;

let received = [];
let sendTotal = 3;
let restMsgLength= 0;
describe("socket-io/pushAndReceive", function(){
  it('login and get token', function (done) {
    let option = {
      url: `******`,
      body: {
        telNum: username,
        password: password,
      },
      json: true
    };
    rq.post(option).then((body)=>{
      //console.log(body);
      assert(typeof body.user !== 'undefined');
      assert(body.user.telNum === username);
      token = body.token;
      roomId = body.user._id;
    }).then(done, done);
  });

  it("connect", function(done){
    client = socketIoClient(wsUrl);
    client.on('connect', done);
    client.on('message', (msg)=>{
      received.push(msg);
    });
  });

  it("socket.io auth", function(done){
    client.emit('join', {token});
    client.on('joined', (msg)=>{
      //console.log(msg);
      assert(msg.message === "join success");
      assert(msg.roomId === roomId);
      done();
    });
  });
  it(`look received message before push`, function(done){
    co(function* () {
      yield Promise.delay(1500);
      console.log(received);
      assert(received.length>=0);
    }).then(done, done);
  });
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
  it(`send ${sendTotal} message`, function(done){
    co(function*(){
      for(let i=0;i<sendTotal;i++){
        yield pushMessage({roomId, message:{title: uuid.v4(), content: uuid.v4()}})
      }
    }).then(done, done);
  });

  it(`look received message after`, function(done){
    co(function* () {
      yield Promise.delay(500*sendTotal);
      console.log(received.length, sendTotal);
      console.log(received);
      assert(received.length>=sendTotal);
    }).then(done, done);
  });

  it(`confirmRecept received message`, function(done){
    co(function* () {
      let confirmTotal = received.length - parseInt(Math.random()*received.length);
      for(let i=0;i<confirmTotal;i++){
        let msg = received[i];
        client.emit('confirmRecept', {msgId:msg.msgId, roomId: msg.roomId});
      }
      restMsgLength = received.length-confirmTotal;

      console.log(`restMsgLength ${restMsgLength}`);

      client.off('connect');
      client.off('message');
      client.off('joined');
      client.disconnect();

    }).then(done, done);
  });

  it('reconnect and confirmRecept restMsg', function(done){

    let anotherClient = socketIoClient(wsUrl);
    anotherClient.on('connect', function () {
      console.log('anotherClient connected');
    });
    let msgs = [];
    anotherClient.on('message',(msg)=>{
      msgs.push(msg);
    });
    anotherClient.emit('join', {token});
    anotherClient.on('joined', (msg)=>{
      console.log('anotherClient joined', msg);
    });
    co(function*(){
      yield Promise.delay(500*restMsgLength);
      console.log(msgs);
      assert(msgs.length === restMsgLength);

      for(let i=0;i<msgs.length;i++){
        let msg = msgs[i];
        anotherClient.emit('confirmRecept', {msgId:msg.msgId, roomId: msg.roomId});
      }
      yield Promise.delay(100*restMsgLength);
    }).then(done, done);
  });
});