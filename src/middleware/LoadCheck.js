const Monitor = require('../core/Monitor');
const Whitelist = require('./Whitelist');

console.log('🔧 Loading LoadCheck middleware...');

class LoadCheckMiddleware {
  constructor() {

    Monitor.on('overload', (data) => {
      console.log('🚨 System overload detected:', data.violations?.join(', ') || 'Unknown');
    });

    Monitor.on('recovery', () => {
      console.log('✅ System recovered from overload');
    });
    
    console.log('✅ LoadCheck event listeners registered');
  }

  middleware() {
    return (req, res, next) => {
    
      if (req.path.startsWith('/holding') || 
          req.path === '/status' || 
          req.path === '/health' ||
          req.path === '/dashboard' ||
          req.path === '/admin/overload') {
        return next();
      }


      if (req.isWhitelisted || req.hasBypassToken) {
        return next();
      }


      const status = Monitor.getStatus();
      
      if (status.shouldRedirect) {

        res.setHeader('Retry-After', status.cooldownRemainingSeconds);
        

        return res.redirect(307, '/holding');
      }

      next();
    };
  }
}

const loadCheck = new LoadCheckMiddleware();
console.log('✅ LoadCheck middleware loaded');
module.exports = loadCheck;
