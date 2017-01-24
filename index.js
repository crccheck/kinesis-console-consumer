'use strict'
// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Kinesis.html
const AWS = require('aws-sdk')

const kinesis = new AWS.Kinesis()


function getStreams () {
  return new Promise((resolve, reject) => {
    kinesis.listStreams({}, (err, data) => {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        resolve(data)
      }
    })
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
          resolve(data.StreamDescription.Shards.map((x) => x.ShardId))
        } else {
          reject('No shards!')
        }
      }
    })
  })
}

function getShardIterator (streamName, shardId, options) {
  return new Promise((resolve, reject) => {
    const params = Object.assign({
      ShardId: shardId,
      ShardIteratorType: 'LATEST',
      StreamName: streamName,
    }, options || {})
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
    Limit: 10000,  // https://github.com/awslabs/amazon-kinesis-client/issues/4#issuecomment-56859367
  }
  kinesis.getRecords(params, (err, data) => {
    if (err) console.log(err, err.stack)
    else {
      data.Records.forEach((x) => {
        console.log(x.Data.toString())
      })
      if (!data.NextShardIterator) {
        return  // Shard has been closed
      }

      setTimeout(function () {
        readShard(data.NextShardIterator)
        // idleTimeBetweenReadsInMillis  http://docs.aws.amazon.com/streams/latest/dev/kinesis-low-latency.html
      }, 2000)
    }
  })
}

// EXPORTS
//////////

module.exports.getStreams = getStreams
module.exports._getShardId = getShardId
module.exports._getShardIterator = getShardIterator
module.exports._readShard = readShard

module.exports.main = function (streamName, getShardIteratorOptions) {
  getShardId(streamName)
  .then((shardIds) => {
    const shardIterators = shardIds.map((shardId) =>
      getShardIterator(streamName, shardId, getShardIteratorOptions))
    return Promise.all(shardIterators)
  })
  .then((shardIterators) => {
    shardIterators.forEach((shardIterator) => readShard(shardIterator))
    // return Promise.all(shardIterators.map((shardIterator) => readShard(shardIterator)))
  })
  .catch((err) => console.log(err, err.stack))
}
