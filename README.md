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

    -V, --version                   output the version number
    --list                          Just list all streams and exit
    --type-latest                   (DEFAULT) start reading any new data (LATEST)
    --type-oldest                   start reading from the oldest data (TRIM_HORIZON)
    --type-at <sequence_number>     start reading from this sequence number (AT_SEQUENCE_NUMBER)
    --type-after <sequence_number>  start reading after this sequence number (AFTER_SEQUENCE_NUMBER)
    --type-timestamp <timestamp>    start reading after this time (units: epoch seconds) (AT_TIMESTAMP)
    --no-new-line                   Don't print a new line between records (default: true)
    --regex-filter <regexFilter>    filter data using this regular expression
    --unzip                         Unzip each record before printing
    --shard-ids <shardIds>          filter data only for specified comma seperated shard ids
    --end-timestamp <endTimestamp>  stop retriving events newer than endTimestamp
    --timestamp-path <timestampPath>  By default --end-timestamp will use ApproximateArrivalTimestamp. if you want ot compare some timestamp in data, specify path - within the record
    --partition-key <partitionKey>  Use along with --list command to display the shardId for this partition key
    -h, --help                      output usage information
  ```

### Examples

List Kinesis streams:

    kinesis-console-consumer

Display contents of a stream, "hello-world", starting from 15 minutes ago:

    kinesis-console-consumer 'hello-world' --type-timestamp "$(($(date +%s) - 900))"

Only display records that have something that looks like an IP address.
NOTE: `grep` is preferred, but not all platforms have it.

    kinesis-console-consumer 'hello-world' --regex-filter "\d+\.\d+\.\d+\.\d+"

Display shardId of a particular partition key "key-name" for the stream "hello-world"

    kinesis-console-consumer --list --partition-key 'key-name' 'hello-world' 

Display records from a particular shardId , within start time and end time stamp and end time stamp is present in the data of the event (metadata.timestamp) with a particular regex on pass the output to jq to extract some specific data and store the output to a json file.

    kinesis-console-consumer --shard-ids 'shardId-000000000024' --type-timestamp  2023-08-26T16:20:00.00000Z --end-timestamp 2023-08-26T21:15:00.000Z --timestamp-path 'metadata.timestamp' --regex-filter '"omu_source_endpoint":.*"MYSQL\|JBOS\|PRD\|PH"' odm-prod-ingester-stream | jq '.data.id, .metadata."table-name"' > customers_raw.json

