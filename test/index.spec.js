'use strict'

const assert = require('assert')
const sinon = require('sinon')

const main = require('../index')

// HELPERS
//////////

// Convenience wrapper around Promise to reduce test boilerplate
const AWSPromise = {
  resolve: (value) => {
    return () => ({
      promise: () => Promise.resolve(value),
    })
  },
  reject: (value) => {
    return () => ({
      promise: () => Promise.reject(value),
    })
  },
}


describe('main', () => {
  let client
  let sandbox

  beforeEach(() => {
    client = {}
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('getStreams', () => {
    it('returns data from AWS', () => {
      client.listStreams = AWSPromise.resolve('dat data')
      main.getStreams(client)
        .then((data) => {
          assert.strictEqual(data, 'dat data')
        })
    })

    it('handles errors', () => {
      client.listStreams = AWSPromise.reject('lol error')
      return main.getStreams(client)
        .then((data) => {
          assert.strictEqual(true, false)
        })
        .catch((err) => {
          assert.strictEqual(err, 'lol error')
        })
    })
  })

  describe('getShardId', () => {
    it('throws when there are no shards', () => {
      client.describeStream = AWSPromise.resolve({StreamDescription: {Shards: []}})
      return main._getShardId(client)
        .then((data) => {
          assert.ok(false, 'This should never run')
        })
        .catch((err) => {
          assert.strictEqual(err.message, 'No shards!')
        })
    })

    it('gets shard id', () => {
      client.describeStream = AWSPromise.resolve({StreamDescription: {Shards: [{ShardId: 'shard id'}]}})
      return main._getShardId(client)
        .then((data) => {
          assert.deepEqual(data, ['shard id'])
        })
    })

    it('handles errors', () => {
      client.describeStream = AWSPromise.reject('lol error')
      return main._getShardId(client)
        .then((data) => {
          assert.strictEqual(true, false)
        })
        .catch((err) => {
          assert.strictEqual(err, 'lol error')
        })
    })
  })

  describe('getShardIterator', () => {
    it('gets shard iterator', () => {
      client.getShardIterator = AWSPromise.resolve({ShardIterator: 'shard iterator'})
      return main._getShardIterator(client)
        .then((data) => {
          assert.strictEqual(data, 'shard iterator')
        })
    })

    it('handles errors', () => {
      client.getShardIterator = AWSPromise.reject('lol error')
      return main._getShardIterator(client)
        .then((data) => {
          assert.strictEqual(true, false)
        })
        .catch((err) => {
          assert.strictEqual(err, 'lol error')
        })
    })
  })

  describe('KinesisStreamReader', () => {
    it('constructor sets arguments', () => {
      const reader = new main.KinesisStreamReader(client, 'stream name', {foo: 'bar'})
      assert.ok(reader)
      assert.equal(reader._streamName, 'stream name')
      assert.equal(reader._shardIteratorOptions.foo, 'bar')
    })

    describe('_startKinesis', () => {
      it('emits error when there is an error', () => {
        client.describeStream = AWSPromise.reject('lol error')
        const reader = new main.KinesisStreamReader(client, 'stream name', {foo: 'bar'})

        reader.once('error', (err) => {
          assert.equal(err, 'lol error')
        })

        return reader._startKinesis('stream name', {})
      })

      xit('logs when there is an error', () => {
        client.describeStream = AWSPromise.reject('lol error')
        const reader = new main.KinesisStreamReader(client, 'stream name', {foo: 'bar'})

        return reader._startKinesis('stream name', {})
          .then(() => {
            assert.equal(console.log.args[0][0], 'lol error')
          })
      })
    })

    describe('readShard', () => {
      it('exits when there is an error', () => {
        client.getRecords = (params, cb) => cb('mock error')
        const reader = new main.KinesisStreamReader(client, 'stream name', {foo: 'bar'})

        reader.once('error', (err) => {
          assert.equal(err, 'mock error')
        })

        reader.readShard()
      })

      it('exits when shard is closed', () => {
        client.getRecords = (params, cb) => cb(undefined, {Records: []})
        const reader = new main.KinesisStreamReader(client, 'stream name', {foo: 'bar'})

        reader.once('error', () => {
          assert.ok(false, 'this should never run')
        })

        reader.readShard()
      })

      it('continues to read open shard', () => {
        const clock = sinon.useFakeTimers()
        const getNextIterator = sinon.stub()
        getNextIterator.onFirstCall().returns('shard iterator')
        getNextIterator.onSecondCall().returns(undefined)
        client.getRecords = (params, cb) =>
          cb(undefined, {Records: [{Data: ''}], NextShardIterator: getNextIterator()})
        const reader = new main.KinesisStreamReader(client, 'stream name', {foo: 'bar'})

        reader.once('error', () => {
          assert.ok(false, 'this should never run')
        })

        reader.readShard()

        assert.strictEqual(getNextIterator.callCount, 1)
        clock.tick(10000)  // A number bigger than the idle time
        assert.strictEqual(getNextIterator.callCount, 2)
        clock.restore()
      })
    })

    it('_read only calls _startKinesis once', () => {
      const reader = new main.KinesisStreamReader(client, 'stream name', {foo: 'bar'})
      sandbox.stub(reader, '_startKinesis').returns(Promise.resolve())

      reader._read()
      reader._read()

      assert.equal(reader._startKinesis.callCount, 1)
    })
  })
})
