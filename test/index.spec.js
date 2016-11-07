'use strict'

const assert = require('assert')
const proxyquire = require('proxyquire').noCallThru()
const sinon = require('sinon')


describe('main', () => {
  let AWS

  beforeEach(() => {
    sinon.stub(console, 'log')
    sinon.stub(console, 'error')
    AWS = {
      Kinesis: class {},
    }
  })

  afterEach(() => {
    console.error.restore()
    console.log.restore()
  })

  describe('getStreams', () => {
    it('returns data from AWS', () => {
      AWS.Kinesis.prototype.listStreams = (params, cb) => cb(undefined, 'dat data')
      const main = proxyquire('../index', {'aws-sdk': AWS})
      main.getStreams()
        .then((data) => {
          assert.strictEqual(data, 'dat data')
        })
    })

    it('handles errors', () => {
      AWS.Kinesis.prototype.listStreams = (params, cb) => cb('lol error')
      const main = proxyquire('../index', {'aws-sdk': AWS})
      return main.getStreams()
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
      AWS.Kinesis.prototype.describeStream = (params, cb) =>
      cb(undefined, {StreamDescription: {Shards: []}})
      const main = proxyquire('../index', {'aws-sdk': AWS})
      return main._getShardId()
        .then((data) => {
          assert.strictEqual(data, 'shard id')
        })
        .catch((err) => {
          assert.strictEqual(err, 'No shards!')
        })
    })

    it('gets shard id', () => {
      AWS.Kinesis.prototype.describeStream = (params, cb) =>
        cb(undefined, {StreamDescription: {Shards: [{ShardId: 'shard id'}]}})
      const main = proxyquire('../index', {'aws-sdk': AWS})
      return main._getShardId()
        .then((data) => {
          assert.strictEqual(data, 'shard id')
        })
    })

    it('handles errors', () => {
      AWS.Kinesis.prototype.describeStream = (params, cb) =>
        cb('lol error')
      const main = proxyquire('../index', {'aws-sdk': AWS})
      return main._getShardId()
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
      AWS.Kinesis.prototype.getShardIterator = (params, cb) =>
        cb(undefined, {ShardIterator: 'shard iterator'})
      const main = proxyquire('../index', {'aws-sdk': AWS})
      return main._getShardIterator()
        .then((data) => {
          assert.strictEqual(data, 'shard iterator')
        })
    })

    it('handles errors', () => {
      AWS.Kinesis.prototype.getShardIterator = (params, cb) =>
        cb('lol error')
      const main = proxyquire('../index', {'aws-sdk': AWS})
      return main._getShardIterator()
        .then((data) => {
          assert.strictEqual(true, false)
        })
        .catch((err) => {
          assert.strictEqual(err, 'lol error')
        })
    })
  })

  describe('readShard', () => {
    it('exits when there is an error', () => {
      AWS.Kinesis.prototype.getRecords = (params, cb) =>
        cb('hi')
      const main = proxyquire('../index', {'aws-sdk': AWS})
      main._readShard()
    })

    it('exits when shard is closed', () => {
      AWS.Kinesis.prototype.getRecords = (params, cb) =>
        cb(undefined, {Records: []})
      const main = proxyquire('../index', {'aws-sdk': AWS})
      main._readShard()
    })

    it('continues to read open shard', () => {
      const clock = sinon.useFakeTimers()
      const getNextIterator = sinon.stub()
      getNextIterator.onFirstCall().returns('shard iterator')
      getNextIterator.onSecondCall().returns(undefined)
      AWS.Kinesis.prototype.getRecords = (params, cb) =>
        cb(undefined, {Records: [{Data: ''}], NextShardIterator: getNextIterator()})
      const main = proxyquire('../index', {'aws-sdk': AWS})
      main._readShard()
      assert.strictEqual(getNextIterator.callCount, 1)
      clock.tick(10000)  // A number bigger than the idle time
      assert.strictEqual(getNextIterator.callCount, 2)
      clock.restore()
    })
  })
})
