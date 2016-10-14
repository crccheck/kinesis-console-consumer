const proxyquire = require('proxyquire').noCallThru()
const assert = require('assert')
const sinon = require('sinon')


describe('main', () => {
  let main

  beforeEach(() => {
    sinon.stub(console, 'log')
    sinon.stub(console, 'error')
  })

  afterEach(() => {
    console.log.restore()
    console.error.restore()
  })


  describe('getStreams returns data from AWS', () => {
    before(() => {
      const AWS = {
        Kinesis: class {
          listStreams (params, cb) {
            cb(undefined, 'dat data')
          }
        },
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () =>
      main._getStreams()
        .then((data) => {
          assert.strictEqual(data, 'dat data')
        })
    )
  })

  describe('getStreams handles errors', () => {
    let main

    before(() => {
      const AWS = {
        Kinesis: class {
          listStreams (params, cb) {
            cb('lol error')
          }
        },
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () =>
      main._getStreams()
        .then((data) => {
          assert.strictEqual(true, false)
        })
        .catch((err) => {
          assert.strictEqual(err, 'lol error')
        })
    )
  })


  describe('getShardId throws when there are no shards', () => {
    before(() => {
      const AWS = {
        Kinesis: class {
          describeStream (params, cb) {
            cb(undefined, {StreamDescription: {Shards: []}})
          }
        },
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () =>
      main._getShardId()
        .then((data) => {
          assert.strictEqual(data, 'shard id')
        })
        .catch((err) => {
          assert.strictEqual(err, 'No shards!')
        })
    )
  })

  describe('getShardId gets shard id', () => {
    before(() => {
      const AWS = {
        Kinesis: class {
          describeStream (params, cb) {
            cb(undefined, {StreamDescription: {Shards: [{ShardId: 'shard id'}]}})
          }
        },
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () =>
      main._getShardId()
        .then((data) => {
          assert.strictEqual(data, 'shard id')
        })
    )
  })


  describe('getShardIterator gets shard iterator', () => {
    before(() => {
      const AWS = {
        Kinesis: class {
          getShardIterator (params, cb) {
            cb(undefined, {ShardIterator: 'shard iterator'})
          }
        },
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () =>
      main._getShardIterator()
        .then((data) => {
          assert.strictEqual(data, 'shard iterator')
        })
    )
  })


  describe('readShard exits when there is an error', () => {
    before(() => {
      const AWS = {
        Kinesis: class {
          getRecords (params, cb) {
            cb('hi')
          }
        },
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () =>
      main._readShard()
    )
  })

  describe('readShard exits when shard is closed', () => {
    before(() => {
      const AWS = {
        Kinesis: class {
          getRecords (params, cb) {
            cb(undefined, {Records: []})
          }
        },
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () =>
      main._readShard()
    )
  })

  describe('readShard continues to read open shard', () => {
    let getNextIterator

    before(() => {
      getNextIterator = sinon.stub()
      getNextIterator.onFirstCall().returns('shard iterator')
      getNextIterator.onSecondCall().returns(undefined)
      const AWS = {
        Kinesis: class {
          getRecords (params, cb) {
            cb(undefined, {Records: [], NextShardIterator: getNextIterator()})
          }
        },
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () => {
      main._readShard()
      assert.strictEqual(getNextIterator.callCount, 2)
    })
  })
})
