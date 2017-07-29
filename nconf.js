const config = require('./config')
const nconf = require('nconf')

nconf.overrides(config)

module.exports = nconf