const nconf = require('../nconf')
const Promise = require('bluebird')
const request = require('request')

exports.getUserInfo = (userInfo) => {
  let _userinfo = nconf.get('userInfo')
  if(userInfo.name === _userinfo.name && userInfo.password === _userinfo.password) {
    return { _id: _userinfo.id }
  }
}





