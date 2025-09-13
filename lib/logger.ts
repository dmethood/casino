import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Simplified logger for development to avoid worker thread issues
});

export function createRequestLogger(request?: Request) {
  const requestId = Math.random().toString(36).substring(2, 15);
  const url = request?.url || 'unknown';
  const method = request?.method || 'unknown';

  return logger.child({
    requestId,
    url,
    method,
  });
}

export { logger };

export default logger;
