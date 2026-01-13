const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const Monitor = require('./Monitor');
const Whitelist = require('../middleware/Whitelist');
const LoadCheck = require('../middleware/LoadCheck');
const ConfigManager = require('./ConfigManager');

console.log('🔧 Loading Gateway...');

class Gateway {
  constructor() {
    console.log('🛠️  Creating Gateway instance...');
    this.app = express();
    this.server = null;
    this.config = ConfigManager.get();
    
    this.initMiddleware();
    this.initRoutes();
    this.initProxy();
    
    console.log('✅ Gateway instance created');
  }

  initMiddleware() {
    console.log('🔧 Initializing middleware...');
    

    this.app.set('trust proxy', this.config.server.trustProxy);
    

    this.app.use(Whitelist.middleware());
    

    this.app.use((req, res, next) => {
      Monitor.incrementConnections();
      res.on('finish', () => {
        Monitor.decrementConnections();
      });
      next();
    });
    

    this.app.use(LoadCheck.middleware());
    
    console.log('✅ All middleware initialized');
  }

  initRoutes() {
    console.log('🔧 Initializing routes...');
    

    this.app.get('/holding', (req, res) => {
      const holdingPath = path.join(__dirname, '../../assets/main.html');
      
      if (!fs.existsSync(holdingPath)) {
        return res.status(404).send('Holding page not found');
      }
      
      res.sendFile(holdingPath);
    });
    
    this.app.get('/hold/:token', (req, res) => {
      const { token } = req.params;
      const adminToken = this.config.security.adminToken;
      
      if (!token || token !== adminToken) {
        return res.status(401).send('Invalid token');
      }
      
      Monitor.forceOverload(true);
      
      res.send('🚨 OVERLOAD FORCED');
    });

    this.app.get('/release/:token', (req, res) => {
      const { token } = req.params;
      const adminToken = this.config.security.adminToken;
      
      if (!token || token !== adminToken) {
        return res.status(401).send('Invalid token');
      }
      
      Monitor.forceOverload(false);
      
      res.send('✅ OVERLOAD RELEASED');
    });
    
    console.log('✅ Routes initialized (3 endpoints)');
  }

  initProxy() {
    console.log('🔧 Initializing proxy...');
    console.log(`🎯 Proxy target: ${this.config.proxy.target}`);
    
    const proxyOptions = {
      target: this.config.proxy.target,
      changeOrigin: true,
      on: {
        error: (err, req, res) => {
          console.error('Proxy error:', err.message);
          res.status(502).send('Backend down');
        }
      }
    };
    
    const proxy = createProxyMiddleware(proxyOptions);
    
    this.app.use('*', (req, res, next) => {
      if (res.headersSent) return next();
      proxy(req, res, next);
    });
    
    console.log('✅ Proxy initialized');
  }

  start() {
    const PORT = this.config.server.port;
    
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting on port ${PORT}...`);
      
      this.server = this.app.listen(PORT, () => {
        console.log(`🎉 RUNNING: http://localhost:${PORT}`);
        console.log(`📡 Proxy → ${this.config.proxy.target}`);
        
        Monitor.start();
        
        console.log('\n' + '='.repeat(40));
        console.log('🔥 LOAD GUARDIAN - MINIMAL');
        console.log('='.repeat(40));
        console.log('  /holding         ← main.html (as-is)');
        console.log('  /hold/{token}    ← Force overload');
        console.log('  /release/{token} ← Release overload');
        console.log('  /*               ← Proxy to backend');
        console.log('='.repeat(40));
        console.log('\n💀 Ready.');
        
        resolve(this.server);
      });
      
      this.server.on('error', reject);
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      console.log('🛑 Stopping...');
      Monitor.stop();
      
      this.server.close(() => {
        this.server = null;
        resolve();
      });
      
      setTimeout(() => {
        if (this.server) {
          this.server.closeAllConnections();
          this.server.close();
          this.server = null;
          resolve();
        }
      }, 2000);
    });
  }
}

console.log('✅ Gateway module loaded');
module.exports = Gateway;
