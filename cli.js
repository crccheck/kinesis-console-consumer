#!/usr/bin/env node
'use strict'

const AWS = require('aws-sdk')
const program = require('commander')
const updateNotifier = require('update-notifier')

const index = require('./')
const pkg = require('./package.json')

const client = new AWS.Kinesis()
const listCommandOptions = {
  streamName: '',
  partitionKey: '',
}

program
  .version(pkg.version)
  .arguments('<stream_name>')
  // XXX --list works as an accident of not specifying a stream_name
  .option('--list', 'Just list all streams and exit. If you want to get the shard Id for key use --partition-key along with stream_name ')
  .option('--type-latest', '(DEFAULT) start reading any new data (LATEST)')
  .option('--type-oldest', 'start reading from the oldest data (TRIM_HORIZON)')
  .option('--type-at <sequence_number>', 'start reading from this sequence number (AT_SEQUENCE_NUMBER)')
  .option('--type-after <sequence_number>', 'start reading after this sequence number (AFTER_SEQUENCE_NUMBER)')
  .option('--type-timestamp <timestamp>', 'start reading after this time (units: epoch seconds) (AT_TIMESTAMP)')
  .option('--no-new-line', "Don't print a new line between records")
  .option('--regex-filter <regexFilter>', 'filter data using this regular expression')
  .option('--unzip', 'Unzip each record before printing')
  .option('--shard-ids <shardIds>', 'filter data only for specified comma seperated shard ids')
  .option('--partition-key <partitionKey>', 'as part of list command display the shardId for this partition key')
  .option('--end-timestamp <endTimestamp>', 'stop retriving events newer than endTimestamp')
  .option('--timestamp-path <timestampPath>', 'timestamp path - within the record')
  .action((streamName) => {
    if (program.list) {
      // Hack program.args to be empty so the getStreams block below will run instead
      program.args = []
      listCommandOptions.partitionKey = program.partitionKey
      listCommandOptions.streamName = streamName
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
    options.newLine = program.newLine
    options.endTimestamp = program.endTimestamp
    options.timestampPath = program.timestampPath
    if (program.regexFilter) {
      options.regexFilter = program.regexFilter
    } else {
      options.regexFilter = '.*'
    }
    options.unzip = program.unzip
    if (program.shardIds) {
      options.shardIds = program.shardIds.split(',').map(item => item.trim())
    }
    const reader = new index.KinesisStreamReader(client, streamName, options)
    reader.pipe(process.stdout)
  })
  .parse(process.argv)

if (!program.args.length) {
  if (listCommandOptions.partitionKey && listCommandOptions.streamName) {
    index.getShardId(client, listCommandOptions.streamName, listCommandOptions.partitionKey)
      .then(console.log)
      .catch(console.error)
  } else {
    index.getStreams(client)
      .then(console.log)
      .catch(console.error)
  }
}

updateNotifier({ pkg }).notify()
