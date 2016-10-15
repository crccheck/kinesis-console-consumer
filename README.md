Kinesis Console Consumer
========================

[![Build Status](https://travis-ci.org/crccheck/kinesis-console-consumer.svg?branch=master)](https://travis-ci.org/crccheck/kinesis-console-consumer)
[![npm version](https://badge.fury.io/js/kinesis-console-consumer.svg)](https://badge.fury.io/js/kinesis-console-consumer)

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


  [Kafka quickstart]: http://kafka.apache.org/documentation.html#quickstart_consume
