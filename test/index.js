const proxyquire = require('proxyquire').noCallThru()
const assert = require('assert')


describe('main', () => {
  describe('getStreams returns data from AWS', () => {
    let main

    before(() => {
      class Kinesis {
        listStreams (params, cb) {
          cb(undefined, 'dat data')
        }
      }

      const AWS = {
        Kinesis,
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () =>
      main.getStreams().then((data) => {
        assert.strictEqual(data, 'dat data')
      })
    )
  })

  describe('getStreams handles errors', () => {
    let main

    before(() => {
      class Kinesis {
        listStreams (params, cb) {
          cb('lol error')
        }
      }

      const AWS = {
        Kinesis,
      }

      main = proxyquire('../index', {'aws-sdk': AWS})
    })

    it('works', () =>
      main.getStreams().then((data) => {
        assert.strictEqual(true, false)
      }).catch((err) => {
        assert.strictEqual(err, 'lol error')
      })
    )
  })
})
