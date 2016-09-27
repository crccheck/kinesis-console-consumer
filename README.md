Kinesis Console Consumer
========================

[![npm version](https://badge.fury.io/js/kinesis-console-consumer.svg)](https://badge.fury.io/js/kinesis-console-consumer)

The [Kafka quickstart] demos a simple consumer so you can quickly inspect your
Kafka stream. Unfortunately, there is no equivalent for AWS Kinesis...

Until now.


Usage
-----

    npm install [-g] kinesis-console-consumer

    kinesis-console-consumer <stream_name>

If no stream name is specified, a list of streams is printed.


  [Kafka quickstart]: http://kafka.apache.org/documentation.html#quickstart_consume
