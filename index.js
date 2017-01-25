'use strict'
// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Kinesis.html
const AWS = require('aws-sdk')
const debug = require('debug')('kinesis-console-consumer')

const kinesis = new AWS.Kinesis()


function getStreams () {
  return kinesis.listStreams({}).promise()
}

function getShardId (streamName) {
  const params = {
    StreamName: streamName,
  }
  return kinesis.describeStream(params).promise()
    .then((data) => {
      if (!data.StreamDescription.Shards.length) {
        throw new Error('No shards!')
      }

      debug('getShardId found %d shards', data.StreamDescription.Shards.length)
      return data.StreamDescription.Shards.map((x) => x.ShardId)
    })
}

function getShardIterator (streamName, shardId, options) {
  const params = Object.assign({
    ShardId: shardId,
    ShardIteratorType: 'LATEST',
    StreamName: streamName,
  }, options || {})
  return kinesis.getShardIterator(params).promise()
    .then((data) => {
      debug('getShardIterator got iterator id: %s', data.ShardIterator)
      return data.ShardIterator
    })
}

function readShard (shardIterator) {
  debug('readShard starting from %s', shardIterator)
  const params = {
    ShardIterator: shardIterator,
    Limit: 10000,  // https://github.com/awslabs/amazon-kinesis-client/issues/4#issuecomment-56859367
  }
  // Not written using Promises because they make it harder to keep the program alive here
  kinesis.getRecords(params, (err, data) => {
    if (err) console.log(err, err.stack)
    else {
      data.Records.forEach((x) => {
        console.log(x.Data.toString())
      })
      if (!data.NextShardIterator) {
        debug('readShard.closed %s', shardIterator)
        return
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
