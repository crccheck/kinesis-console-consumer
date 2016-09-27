#!/usr/bin/env node

const program = require('commander')
const fs = require('fs')
const index = require('./')

const pkg = JSON.parse(fs.readFileSync(`${__dirname}/package.json`))

program
  .version(pkg.version)
  .arguments('<stream_name>')
  // .option('-t --shard-iterator-type <type>',
  //         'one of: AT_SEQUENCE_NUMBER AFTER_SEQUENCE_NUMBER TRIM_HORIZON LATEST AT_TIMESTAMP')
  .action((streamName) => {
    index.main(streamName)
  })
  .parse(process.argv)

if (!program.args.length) {
  index.listStreams()
}
