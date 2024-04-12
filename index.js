'use strict'
// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Kinesis.html
const Readable = require('stream').Readable
const debug = require('debug')('kinesis-console-consumer')
const zlib = require('zlib')
const crypto = require('crypto')

/* global BigInt */
const _get = require('lodash.get')

function getStreams (client) {
  return client.listStreams({}).promise()
}
async function getShardId (client, streamName, partitionKey) {
  try {
    const hashKey = md5Hash(partitionKey)
    const response = await client.describeStream({ StreamName: streamName }).promise()
    if (!response.StreamDescription.Shards) {
      throw new Error('No shards found in the stream.')
    }

    for (const shard of response.StreamDescription.Shards) {
      const startingHashKey = BigInt(shard.HashKeyRange.StartingHashKey)
      const endingHashKey = BigInt(shard.HashKeyRange.EndingHashKey)

      if (hashKey >= startingHashKey && hashKey <= endingHashKey) {
        return shard.ShardId
      }
    }

    return null // Shard not found for the given partition key
  } catch (error) {
    console.error('Error getting shard ID:', error)
    return null
  }
}


function md5Hash (partitionKey) {
  const hashBytes = crypto.createHash('md5').update(partitionKey).digest()
  return BigInt('0x' + hashBytes.toString('hex')).toString()
}
function getShardIds (client, streamName, shardIds) {
  const params = {
    StreamName: streamName,
  }
  return client.describeStream(params).promise()
    .then((data) => {
      if (!data.StreamDescription.Shards.length) {
        throw new Error('No shards!')
      }

      debug('getShardIds found %d shards', data.StreamDescription.Shards.length)
      const allShards = data.StreamDescription.Shards.map((x) => x.ShardId)

      if (shardIds) {
        const isSubset = shardIds.every(shardId => allShards.includes(shardId))
        if (isSubset) {
          return shardIds
        } else {
          throw new Error('Incorrect shards specified')
        }
      } else {
        return allShards
      }
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
    super({
      objectMode: !!options.parser, // Should this always be true?
    })
    this.client = client
    this.streamName = streamName
    this.options = Object.assign({
      interval: 2000,
      parser: (x) => x,
      filter: new RegExp(options.regexFilter),
    }, options)
    this._started = false // TODO this is probably built into Streams
    this.iterators = new Set()
  }

  _startKinesis () {
    const whitelist = ['ShardIteratorType', 'Timestamp', 'StartingSequenceNumber']
    const shardIteratorOptions = Object.keys(this.options)
      .filter((x) => whitelist.indexOf(x) !== -1)
      .reduce((result, key) => Object.assign(result, { [key]: this.options[key] }), {})
    return getShardIds(this.client, this.streamName, this.options.shardIds)
      .then((shardIds) => {
        debug('shardIds:', shardIds)
        const shardIterators = shardIds.map((shardId) =>
          getShardIterator(this.client, this.streamName, shardId, shardIteratorOptions))
        return Promise.all(shardIterators)
      })
      .then((shardIterators) => {
        shardIterators.forEach((shardIterator) => this.readShard(shardIterator, this.options.endTimestamp, this.options.timestampPath))
      })
      .catch((err) => {
        this.emit('error', err) || console.log(err, err.stack)
      })
  }

  readShard (shardIterator, endTimestamp, timestampPath) {
    let shouldBreak = false
    this.iterators.add(shardIterator)
    debug('readShard starting from %s (out of %d)', shardIterator, this.iterators.size)
    const params = {
      ShardIterator: shardIterator,
      Limit: 10000, // https://github.com/awslabs/amazon-kinesis-client/issues/4#issuecomment-56859367
    }
    // Not written using Promises because they make it harder to keep the program alive here
    this.client.getRecords(params, (err, data) => {
      if (err) {
        this.emit('error', err) || console.log(err, err.stack)
        return
      }

      if (data.MillisBehindLatest > 60 * 1000) {
        debug('warning: behind by %d milliseconds', data.MillisBehindLatest)
      }
      data.Records.forEach((x) => {
        let record = this.options.parser(x.Data)
        if (this.options.unzip) {
          record = zlib.gunzipSync(Buffer.from(record, 'base64')).toString()
        }
        if (this.options.newLine) {
          record += '\n'
        }
        if (this.options.filter.test(record)) {
          this.push(record)
        }

        if (endTimestamp) {
          if (timestampPath && _get(JSON.parse(record), timestampPath) > endTimestamp) {
            shouldBreak = true
          } else if (x.ApproximateArrivalTimestamp > (new Date(endTimestamp))) {
            shouldBreak = true
          }
        }
      })

      if (data.Records.length) {
        this.emit('checkpoint', data.Records[data.Records.length - 1].SequenceNumber)
      }
      this.iterators.delete(shardIterator)
      if (!data.NextShardIterator) {
        debug('readShard.closed %s', shardIterator)
        // TODO this.end() when number of shards closed == number of shards being read
        // this._started = 0
        return
      }

      const timeoutId = setTimeout(() => {
        this.readShard(data.NextShardIterator, endTimestamp, timestampPath)
        // idleTimeBetweenReadsInMillis  http://docs.aws.amazon.com/streams/latest/dev/kinesis-low-latency.html
      }, this.options.interval)

      if (shouldBreak) {
        clearTimeout(timeoutId)
      }
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
exports.getShardId = getShardId
exports._getShardIds = getShardIds
exports._getShardIterator = getShardIterator
exports._md5Hash = md5Hash

exports.KinesisStreamReader = KinesisStreamReader
