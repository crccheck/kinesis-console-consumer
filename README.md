Kinesis Console Consumer
========================

[![Build Status](https://travis-ci.org/crccheck/kinesis-console-consumer.svg?branch=master)](https://travis-ci.org/crccheck/kinesis-console-consumer)
[![npm version](https://badge.fury.io/js/kinesis-console-consumer.svg)](https://badge.fury.io/js/kinesis-console-consumer)
[![Coverage Status](https://coveralls.io/repos/github/crccheck/kinesis-console-consumer/badge.svg?branch=master)](https://coveralls.io/github/crccheck/kinesis-console-consumer?branch=master)

The [Kafka quickstart] demos a simple consumer so you can quickly inspect your
Kafka stream. Unfortunately, there is no equivalent for AWS Kinesis...

Until now.


Usage
-----

    npm install [-g] kinesis-console-consumer

    kinesis-console-consumer <stream_name>

### Help

```
$ kinesis-console-consumer --help

  Usage: kinesis-console-consumer [options] <stream_name>

  Options:

    -h, --help                      output usage information
    -V, --version                   output the version number
    --type-latest                   (DEFAULT) start reading any new data (LATEST)
    --type-oldest                   start reading from the oldest data (TRIM_HORIZON)
    --type-at <sequence_number>     start reading from this sequence number (AT_SEQUENCE_NUMBER)
    --type-after <sequence_number>  start reading after this sequence number (AFTER_SEQUENCE_NUMBER)
    --type-timestamp <timestamp>    start reading after this time (units: epoch seconds) (AT_TIMESTAMP)
```

### Examples

List Kinesis streams:

    kinesis-console-consumer

Display contents of a stream, "hello-world", starting from 15 minutes ago:

    kinesis-console-consumer 'hello-world' --type-timestamp "$(($(date +%s) - 900))"


Usage as a package
------------------

You can import this module into your own project to use as Kinesis Stream
Reader readable stream too!

    const AWS = require('aws-sdk')
    const { KinesisStreamReader } = require('kinesis-console-consumer')
    const client = AWS.Kinesis()
    const reader = new KinesisStreamReader(client, streamName, options)
    reader.pipe(yourDestinationHere)

### Options

* `interval: number` (default: `2000`) Milliseconds between each Kinesis read. Remember limit is 5 reads / second / shard
* `parser: Function` If this is set, this function is applied to the data. Example:

        const client = AWS.Kinesis()
        const reader = new KinesisStreamReader(client, streamName, {parser: JSON.parse})
        reader.on('data', console.log(data.id))

* And any [getShardIterator] parameter

### Custom events

These are the WIP events you can attach to the reader:

* `checkpoint` Inspired by [kinesis-readable], this fires when data is received so you can keep track of the last successful sequence read

        reader.on('checkpoint', (sequenceNumber: string) => {})


  [Kafka quickstart]: http://kafka.apache.org/documentation.html#quickstart_consume
  [getShardIterator]: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Kinesis.html#getShardIterator-property
  [kinesis-readable]: https://github.com/rclark/kinesis-readable
