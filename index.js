'use strict'
// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Kinesis.html
const Readable = require('stream').Readable
const debug = require('debug')('kinesis-console-consumer')


function getStreams (client) {
  return client.listStreams({}).promise()
}

function getShardId (client, streamName) {
  const params = {
    StreamName: streamName,
  }
  return client.describeStream(params).promise()
    .then((data) => {
      if (!data.StreamDescription.Shards.length) {
        throw new Error('No shards!')
      }

      debug('getShardId found %d shards', data.StreamDescription.Shards.length)
      return data.StreamDescription.Shards.map((x) => x.ShardId)
    })
}

function getShardIterator (client, streamName, shardId, options) {
  const params = Object.assign({
    ShardId: shardId,
    ShardIteratorType: 'LATEST',
    StreamName: streamName,
  }, options || {})
  return client.getShardIterator(params).promise()
    .then((data) => {
      debug('getShardIterator got iterator id: %s', data.ShardIterator)
      return data.ShardIterator
    })
}

class KinesisStreamReader extends Readable {
  constructor (client, streamName, options) {
    // should use objectMode since we get whole objects at a time?
    super({})
    this.client = client
    this._started = false  // TODO this is probably built into Streams
    this.streamName = streamName
    this.options = Object.assign({interval: 2000}, options)
  }

  _startKinesis () {
    const whitelist = ['ShardIteratorType', 'Timestamp', 'StartingSequenceNumber']
    const shardIteratorOptions = Object.keys(this.options)
      .filter((x) => whitelist.indexOf(x) !== -1)
      .reduce((result, key) => Object.assign(result, {[key]: this.options[key]}), {})
    return getShardId(this.client, this.streamName)
      .then((shardIds) => {
        const shardIterators = shardIds.map((shardId) =>
          getShardIterator(this.client, this.streamName, shardId, shardIteratorOptions))
        return Promise.all(shardIterators)
      })
      .then((shardIterators) => {
        shardIterators.forEach((shardIterator) => this.readShard(shardIterator))
      })
      .catch((err) => {
        this.emit('error', err) || console.log(err, err.stack)
      })
  }

  readShard (shardIterator) {
    debug('readShard starting from %s', shardIterator)
    const params = {
      ShardIterator: shardIterator,
      Limit: 10000,  // https://github.com/awslabs/amazon-kinesis-client/issues/4#issuecomment-56859367
    }
    // Not written using Promises because they make it harder to keep the program alive here
    this.client.getRecords(params, (err, data) => {
      if (err) {
        this.emit('error', err) || console.log(err, err.stack)
        return
      }

      data.Records.forEach((x) => {
        this.push(x.Data.toString(), 'utf8')
      })
      if (!data.NextShardIterator) {
        debug('readShard.closed %s', shardIterator)
        // TODO this.end() when number of shards closed == number of shards being read
        return
      }

      setTimeout(() => {
        this.readShard(data.NextShardIterator)
        // idleTimeBetweenReadsInMillis  http://docs.aws.amazon.com/streams/latest/dev/kinesis-low-latency.html
      }, this.interval)
    })
  }

  _read (size) {
    if (this._started) {
      return
    }

    this._startKinesis()
      .then(() => {
        this._started = 2
      })
      .catch((err) => {
        this.emit('error', err) || console.log(err, err.stack)
      })
    this._started = 1
  }
}


// EXPORTS
//////////

exports.getStreams = getStreams
exports._getShardId = getShardId
exports._getShardIterator = getShardIterator

exports.KinesisStreamReader = KinesisStreamReader
