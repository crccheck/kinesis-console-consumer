#!/usr/bin/env node
'use strict'

const fs = require('fs')
const program = require('commander')
const updateNotifier = require('update-notifier')
const index = require('./')

const pkg = JSON.parse(fs.readFileSync(`${__dirname}/package.json`))

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
  .action((streamName) => {
    if (program.list) {
      // Hack program.args to be empty so the getStreams block below will run instead
      program.args = []
      return
    }
    const options = {}
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
    index.main(streamName, options)
    index.rs.pipe(process.stdout)
  })
  .parse(process.argv)

if (!program.args.length) {
  index.getStreams().then((data) => console.log(data))
}

updateNotifier({pkg}).notify()
