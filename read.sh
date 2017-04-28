#!/usr/bin/env bash
#
# shard-iterator-type options:
# * TRIM_HORIZON
# * LATEST

set -e

# SHARD_ITERATOR=$(aws kinesis get-shard-iterator \
#   --shard-id shardId-000000000000 \
#   --shard-iterator-type LATEST
#   --stream-name partnership-twitter-status --query 'ShardIterator')
SHARD_ITERATOR=$(aws kinesis get-shard-iterator \
  --shard-id shardId-000000000000 \
  --shard-iterator-type AT_SEQUENCE_NUMBER \
  --starting-sequence-number 49565301421325431477021493407166262332238041340738273282 \
  --stream-name partnership-twitter-status --query 'ShardIterator')

while [ 1 ]; do
  RECORD=$(aws kinesis get-records --shard-iterator $SHARD_ITERATOR)
  echo $RECORD | jq -r ".Records"
  SHARD_ITERATOR=$(echo $RECORD | jq -r ".NextShardIterator")
done
