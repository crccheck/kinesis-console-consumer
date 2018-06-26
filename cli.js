#!/usr/bin/env node
'use strict'

const AWS = require('aws-sdk')
const program = require('commander')
const updateNotifier = require('update-notifier')

const index = require('./')
const pkg = require('./package.json')

const client = new AWS.Kinesis()
const zlib = require('zlib')

const gzip_head = Buffer.from([0x1f, 0x8b])
const zlib_low_head = Buffer.from([0x78, 0x01])
const zlib_default_head = Buffer.from([0x78, 0x9c])
const zlib_best_head = Buffer.from([0x78, 0xda])

program
  .version(pkg.version)
  .arguments('<stream_name>')
  // XXX --list works as an accident of not specifying a stream_name
  .option('--list', 'Just list all streams and exit')
  .option('--type-latest', '(DEFAULT) start reading any new data (LATEST)')
  .option('--type-oldest', 'start reading from the oldest data (TRIM_HORIZON)')
  .option('--type-at <sequence_number>', 'start reading from this sequence number (AT_SEQUENCE_NUMBER)')
  .option('--type-after <sequence_number>', 'start reading after this sequence number (AFTER_SEQUENCE_NUMBER)')
  .option('--type-timestamp <timestamp>', 'start reading after this time (units: epoch seconds) (AT_TIMESTAMP)')
  .option('--no-new-line', "Don't print a new line between records")
  .option('--regex-filter <regexFilter>', 'filter data using this regular expression')
  .action((streamName) => {
    if (program.list) {
      // Hack program.args to be empty so the getStreams block below will run instead
      program.args = []
      return
    }
    const options = {
      parser: (buffer) => {
        let buffer_head = buffer.slice(0, 2)
        if (buffer_head.equals(zlib_default_head) || buffer_head.equals(gzip_head) || buffer_head.equals(zlib_low_head) || buffer_head.equals(zlib_best_head)) {
          try {
            buffer = zlib.unzipSync(buffer)
          } catch (e) {
            console.error(`err_data :: ${e.message} :: ${buffer}`)
          }
        }

        return buffer
      },
    }
    if (program.typeTimestamp) {
      options.ShardIteratorType = 'AT_TIMESTAMP'
      if (isNaN(program.typeTimestamp)) {
        options.Timestamp = program.typeTimestamp
      } else {
        options.Timestamp = parseInt(program.typeTimestamp, 10)
      }
    } else if (program.typeAfter) {
      options.ShardIteratorType = 'AFTER_SEQUENCE_NUMBER'
      options.StartingSequenceNumber = program.typeAfter
    } else if (program.typeAt) {
      options.ShardIteratorType = 'AT_SEQUENCE_NUMBER'
      options.StartingSequenceNumber = program.typeAt
    } else if (program.typeOldest) {
      options.ShardIteratorType = 'TRIM_HORIZON'
    } else {
      options.ShardIteratorType = 'LATEST'
    }
    options.newLine = program.newLine
    if (program.regexFilter) {
      options.regexFilter = program.regexFilter
    } else {
      options.regexFilter = '.*'
    }
    const reader = new index.KinesisStreamReader(client, streamName, options)
    reader.pipe(process.stdout)
  })
  .parse(process.argv)

if (!program.args.length) {
  index.getStreams(client)
    .then(console.log)
    .catch(console.error)
}

updateNotifier({pkg}).notify()
