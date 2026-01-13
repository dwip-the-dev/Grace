const winston = require('winston');
const path = require('path');
const ConfigManager = require('../core/ConfigManager');

console.log('🔧 Loading Logger...');

const config = ConfigManager.get('logging');
const transports = [];


transports.push(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} ${level}: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ''
      }`;
    })
  )
}));


if (config.file) {
  try {

    const logDir = path.dirname(config.file);
    require('fs').mkdirSync(logDir, { recursive: true });
    
    transports.push(new winston.transports.File({
      filename: config.file,
      level: config.level,
      maxsize: config.maxSize,
      maxFiles: config.maxFiles
    }));
    console.log(`✅ File logging enabled: ${config.file}`);
  } catch (error) {
    console.error('❌ Failed to enable file logging:', error.message);
  }
}

const logger = winston.createLogger({
  level: config.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: transports
});


logger.logOverload = function(metrics, violations = []) {
  this.warn('System overload triggered', {
    cpu: metrics.cpu,
    memory: metrics.memory,
    load: metrics.load,
    violations: violations,
    connections: metrics.connections
  });
};

logger.logRecovery = function(metrics) {
  this.info('System recovered from overload', {
    cpu: metrics.cpu,
    memory: metrics.memory,
    load: metrics.load
  });
};

logger.logRequest = function(req, res, duration) {
  if (process.env.NODE_ENV === 'development') {
    this.debug('Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: duration,
      ip: req.ip
    });
  }
};

console.log('✅ Logger loaded');
module.exports = logger;
