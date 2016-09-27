module.exports = {
  extends: 'standard',
  env: {
    mocha: true
  },
  rules: {
    // Lets you manipulate lines easier and have cleaner diffs
    'comma-dangle': ['error', 'always-multiline'],
    // Two blanks for more legibile demarcation
    'no-multiple-empty-lines': ['error', {max: 2}],
    // This is often done in dev, and Uglify will clean it for prod anyways
    'no-unreachable': 'warn',
    // Lets you write more legible comments
    'spaced-comment': ['error', 'always', {exceptions: ['/']}],
  }
}
