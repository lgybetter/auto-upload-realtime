module.exports = {
  port: 5001,
  queue: {
    suffix: "YYYY-MM-DD",
    expire: 60*60*24*7
  },
  redisUrl: "redis://localhost:6379/0",
  userInfo: {
    name: 'lgybetter',
    password: '123456',
    id: 'lgybetter2017'
  }
}