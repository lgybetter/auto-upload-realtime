const redis = require('redis')

const co = require('co')
const Promise = require('bluebird')
const moment = require('moment');
const nconf = require('../nconf');

let queueConfig = nconf.get('queue');

let redisUrl = nconf.get('redisUrl');

console.log('redisUrl', redisUrl);

let client = redis.createClient(redisUrl);

Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

const getRedisKeyName = (src) => {
  let suffix = moment().format(queueConfig.suffix);
  return src + suffix;
}

/**
 * 添加消息到消息缓存中
 * @param {*} roomIdPrex 用户的Id
 * @param {*} message 传递消息
 */
const save = (roomIdPrefix, message) => {

  let incIds = getRedisKeyName('incIds');

  let roomId = getRedisKeyName(roomIdPrefix);

  return co(function* () {
    let score = yield client.hincrbyAsync(incIds, roomId, 1)
    let storeMsg = { score, message}

    yield Promise.all([client.zaddAsync(roomId, score, JSON.stringify(storeMsg)), client.expireAsync(incIds, queueConfig.expire), client.expireAsync(roomId, queueConfig.expire)]);

    return Promise.resolve({ message: message, msgId: score, roomId: roomId })
  }).catch(err => Promise.reject({ message: err.message }))
}

/**
 * 根据score区间从消息缓存中移除消息
 * @param {*} roomId 用户的Id
 * @param {*} minScore 消息排序最小值
 * @param {*} maxScore 消息排序最大值
 */
const remove = (roomId, minScore='-inf', maxScore='+inf') => {
  return co(function* () {
    let message = yield client.zremrangebyscoreAsync(roomId, minScore, maxScore)
    return Promise.resolve({ remove: message })
  }).catch(err => Promise.reject({ message: err.message }))
}

/**
 * 根据score区间从消息缓存中移除单条消息
 * @param {*} roomId 用户的Id
 * @param {*} score 消息排序值
 */
const removeOne = (roomId, score) => {
  return co(function* () {
    return remove(roomId, score, score)
  }).catch(err => Promise.reject({ message: err.message }))
}

/**
 * 根据score区间从消息缓存中查找消息
 * @param {*} roomIdPrefix 用户的Id
 */
const findAll = (roomIdPrefix) => {

  let minScore = '-inf';
  let maxScore = '+inf';

  return co(function* () {
    let keys = (yield client.keysAsync(roomIdPrefix + '*')).sort();
    let messages = []
    for(let index in keys){
      let roomId = keys[index];
      let _messages = yield client.zrangebyscoreAsync(roomId, minScore, maxScore)
      //console.log(roomId, _messages);
      _messages.forEach(message => {
        let parsedMessage = JSON.parse(message);
        parsedMessage.roomId = roomId;
        messages.push(parsedMessage);
      })
    }

    return Promise.resolve(messages)
  }).catch(err => Promise.reject({ message: err.message }))
}

/**
 * 根据score区间从消息缓存中查找单条消息
 * @param {*} roomId 用户的Id
 * @param {*} score 消息排序值
 */
const findOne = (roomId, score) => {
  return co(function* () {
    let messages = yield find(roomId, score, score)
    return Promise.resolve(messages[0])
  }).catch(err => Promise.reject({ message: err.message }))
}

module.exports = {
  save,
  remove,
  removeOne,
  findAll,
  findOne
}
