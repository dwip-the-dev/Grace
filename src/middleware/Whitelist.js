console.log('🔧 Loading Whitelist middleware...');

class WhitelistManager {
  constructor() {

    const whitelistStr = process.env.WHITELIST_IPS || '127.0.0.1';
    this.whitelist = whitelistStr.split(',').map(ip => ip.trim());
    
    // Parse bypass tokens
    const tokensStr = process.env.BYPASS_TOKENS || 'test_token';
    this.bypassTokens = new Set(tokensStr.split(',').map(t => t.trim()));
    
    console.log('✅ Whitelist IPs:', this.whitelist);
    console.log('✅ Bypass tokens count:', this.bypassTokens.size);
  }

  isWhitelisted(ip) {
    if (!ip) return false;
    

    const cleanIp = ip.replace('::ffff:', '');
    return this.whitelist.includes(cleanIp);
  }

  isTokenValid(token) {
    return this.bypassTokens.has(token);
  }

  getClientIP(req) {

    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      return ips[0];
    }

    return req.ip || req.connection.remoteAddress;
  }

  middleware() {
    return (req, res, next) => {
      const clientIp = this.getClientIP(req);
      const bypassToken = req.headers['x-bypass-token'] || req.query.bypass_token;
      
      req.isWhitelisted = this.isWhitelisted(clientIp);
      req.hasBypassToken = bypassToken && this.isTokenValid(bypassToken);
      req.clientIp = clientIp;
      
      if (req.isWhitelisted) {
        console.log(`✅ Whitelisted IP: ${clientIp}`);
      }
      if (req.hasBypassToken) {
        console.log(`✅ Bypass token used: ${bypassToken.substring(0, 10)}...`);
      }
      
      next();
    };
  }
}

const whitelist = new WhitelistManager();
console.log('✅ Whitelist loaded');
module.exports = whitelist;
