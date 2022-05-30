const bunyan = require('bunyan');

const defaultLoggingOpts = {
  console: 1,
  stdout: 'debug',
};


function loggerConfig(name) {
  // const opts = (config.get('logging') || {})[name] || defaultLoggingOpts;
  const opts = defaultLoggingOpts;
  const streams = [];

  if (opts.stdout) {
    streams.push({
      stream: process.stdout,
      level: opts.stdout,
    });
  }
  if (opts.file) {
    streams.push({
      path: opts.file,
    });
  }

  return {
    name,
    streams,
  };
}

function buildLogger(name) {
  return bunyan.createLogger(loggerConfig(name));
}

const appLogger = buildLogger('test-cw1');

module.exports = {
  appLogger,
  buildLogger,
};
