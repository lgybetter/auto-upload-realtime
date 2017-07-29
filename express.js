const express = require('express')
const app = express()
const server = require('http').createServer(app)
const nconf = require('nconf')

server.listen(nconf.get('port'), () => {
	console.log("The message server is running at : " + nconf.get('port'), nconf.get('bbcloud'))
})

require('./socket-io').socketIo(server)