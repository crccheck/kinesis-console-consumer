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
          // TODO For heavy duty cases, we would return all shard ids and spin
          // up a reader for each shards
          resolve(data.StreamDescription.Shards[0].ShardId)
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
    Limit: 100,
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

      readShard(data.NextShardIterator)
    }
  })
}

// EXPORTS
//////////

module.exports.getStreams = getStreams

module.exports.main = function (streamName, getShardIteratorOptions) {
  getShardId(streamName)
  .then((shardId) => getShardIterator(streamName, shardId, getShardIteratorOptions))
  .then((shardIterator) => readShard(shardIterator))
  .catch((err) => console.log(err, err.stack))
}
