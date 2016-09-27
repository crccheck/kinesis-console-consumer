// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Kinesis.html
const AWS = require('aws-sdk')

const kinesis = new AWS.Kinesis()

function listStreams () {
  kinesis.listStreams({}, (err, data) => {
    if (err) {
      console.error(err)
    } else {
      console.log(data)
    }
  })
}

function getShardId (streamName) {
  return new Promise((resolve, reject) => {
    const params = {
      StreamName: streamName,
    }
    kinesis.describeStream(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        if (data.StreamDescription.Shards.length) {
          // For heavy duty cases, we would return all shard ids and spin up a
          // reader for each shards
          resolve(data.StreamDescription.Shards[0].ShardId)
        } else {
          reject('No shards!')
        }
      }
    })
  })
}

function getShardIterator (streamName, shardId) {
  return new Promise((resolve, reject) => {
    const params = {
      ShardId: shardId,
      ShardIteratorType: 'LATEST',
      StreamName: streamName,
    }
    kinesis.getShardIterator(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.ShardIterator)
      }
    })
  })
}

function readShard (shardIterator) {
  const params = {
    ShardIterator: shardIterator,
    Limit: 100,
  }
  kinesis.getRecords(params, (err, data) => {
    if (err) console.log(err, err.stack)
    else {
      data.Records.forEach((x) => {
        console.log(x.Data)
        console.log(x.Data.toString())
      })
      readShard(data.NextShardIterator)
    }
  })
}

// EXPORTS
//////////

module.exports.listStreams = listStreams

module.exports.main = function (streamName) {
  getShardId(streamName)
  .then((shardId) => getShardIterator(streamName, shardId))
  .then((shardIterator) => readShard(shardIterator))
  .catch((err) => console.log(err, err.stack))
}
