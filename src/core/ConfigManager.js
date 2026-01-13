const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 Loading ConfigManager...');

class ConfigManager {
  constructor() {
    this.config = this.getDefaultConfig();
    this.loadConfig();
  }

  getDefaultConfig() {

    return {
      server: {
        port: 3000,
        trustProxy: false,
        compression: false,
        helmet: false,
        maxConnections: 1000
      },
      proxy: {
        target: "http://localhost:8080",
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000,
        followRedirects: true
      },
      monitoring: {
        checkInterval: 5000,
        thresholds: {
          cpu: 85,
          memory: 90,
          load: 5.0,
          connections: 1000
        },
        cooldownPeriod: 120000,
        smoothingFactor: 0.3,
        failMode: "open", 
        historySize: 60
      },
      security: {
        rateLimit: {
          enabled: true,
          points: 100,
          duration: 60
        },
        whitelist: ["127.0.0.1", "::1"],
        bypassTokens: [],
        adminToken: null 
      },
      logging: {
        level: "info",
        file: null, 
        maxSize: "100m",
        maxFiles: "14d"
      },
      holdingPage: {
        cache: true,
        theme: "default",
        autoRetry: true,
        retryInterval: 10000
      }
    };
  }

  loadConfig() {
    console.log('📁 Loading configuration...');
    
  
    const env = process.env.NODE_ENV || 'development';
    const envConfigPath = path.join(__dirname, '../../config', `${env}.json`);
    
    if (fs.existsSync(envConfigPath)) {
      try {
        const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        this.config = this.deepMerge(this.config, envConfig);
        console.log(`✅ Loaded ${env} configuration`);
      } catch (error) {
        console.error(`❌ Failed to load ${env} config:`, error.message);
      }
    }

  
    this.overrideWithEnv();

  
    this.validateConfig();

    console.log('✅ Configuration loaded and validated');
  }

  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  overrideWithEnv() {
   
    if (process.env.PORT) {
      this.config.server.port = parseInt(process.env.PORT);
    }
    

    if (process.env.BACKEND_URL) {
      this.config.proxy.target = process.env.BACKEND_URL;
    }
    

    if (process.env.CPU_THRESHOLD) {
      this.config.monitoring.thresholds.cpu = parseFloat(process.env.CPU_THRESHOLD);
    }
    if (process.env.MEMORY_THRESHOLD) {
      this.config.monitoring.thresholds.memory = parseFloat(process.env.MEMORY_THRESHOLD);
    }
    if (process.env.LOAD_THRESHOLD) {
      this.config.monitoring.thresholds.load = parseFloat(process.env.LOAD_THRESHOLD);
    }
    

    if (process.env.CHECK_INTERVAL_MS) {
      this.config.monitoring.checkInterval = parseInt(process.env.CHECK_INTERVAL_MS);
    }
    if (process.env.COOLDOWN_MS) {
      this.config.monitoring.cooldownPeriod = parseInt(process.env.COOLDOWN_MS);
    }
    if (process.env.SMOOTHING_FACTOR) {
      this.config.monitoring.smoothingFactor = parseFloat(process.env.SMOOTHING_FACTOR);
    }
    if (process.env.FAIL_MODE) {
      this.config.monitoring.failMode = process.env.FAIL_MODE;
    }
    
   
    if (process.env.WHITELIST_IPS) {
      const ips = process.env.WHITELIST_IPS.split(',').map(ip => ip.trim()).filter(ip => ip);
      this.config.security.whitelist = ips;
    }
    
    if (process.env.BYPASS_TOKENS) {
      const tokens = process.env.BYPASS_TOKENS.split(',').map(t => t.trim()).filter(t => t);
      this.config.security.bypassTokens = tokens;
    }
    
    if (process.env.ADMIN_TOKEN) {
      this.config.security.adminToken = process.env.ADMIN_TOKEN;
    }
    

    if (process.env.LOG_LEVEL) {
      this.config.logging.level = process.env.LOG_LEVEL;
    }
    if (process.env.LOG_TO_FILE === 'true') {
      this.config.logging.file = process.env.LOG_FILE_PATH || 'logs/loadguardian.log';
    }
    

    if (process.env.CACHE_HOLDING_PAGE === 'false') {
      this.config.holdingPage.cache = false;
    }
    if (process.env.HOLDING_PAGE_THEME) {
      this.config.holdingPage.theme = process.env.HOLDING_PAGE_THEME;
    }
  }

  validateConfig() {
    console.log('🔍 Validating configuration...');
    
    const required = [
      'server.port',
      'proxy.target',
      'monitoring.thresholds.cpu',
      'monitoring.thresholds.memory',
      'security.adminToken'
    ];
    
 
    for (const path of required) {
      const value = this.get(path);
      if (value === null || value === undefined || value === '') {
        throw new Error(`❌ Missing required config: ${path}`);
      }
    }
    

    const thresholds = this.config.monitoring.thresholds;
    if (thresholds.cpu < 50 || thresholds.cpu > 100) {
      throw new Error(`❌ CPU threshold must be between 50-100, got ${thresholds.cpu}`);
    }
    if (thresholds.memory < 50 || thresholds.memory > 100) {
      throw new Error(`❌ Memory threshold must be between 50-100, got ${thresholds.memory}`);
    }
    if (thresholds.load < 0.1 || thresholds.load > 100) {
      throw new Error(`❌ Load threshold must be between 0.1-100, got ${thresholds.load}`);
    }
    

    const validFailModes = ['open', 'closed'];
    if (!validFailModes.includes(this.config.monitoring.failMode)) {
      throw new Error(`❌ Invalid fail mode: ${this.config.monitoring.failMode}. Must be one of: ${validFailModes.join(', ')}`);
    }
    

    if (this.config.monitoring.smoothingFactor < 0 || this.config.monitoring.smoothingFactor > 1) {
      throw new Error(`❌ Smoothing factor must be between 0-1, got ${this.config.monitoring.smoothingFactor}`);
    }
    

    if (this.config.security.adminToken.includes('CHANGE_THIS') || 
        this.config.security.adminToken.includes('default') ||
        this.config.security.adminToken.length < 16) {
      console.warn('⚠️  WARNING: Admin token appears to be weak or default!');
    }
    
    console.log('✅ Configuration validation passed');
  }

  get(path = null) {
    if (!path) return this.config;
    
    const parts = path.split('.');
    let value = this.config;
    
    for (const part of parts) {
      if (value && value[part] !== undefined) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return value;
  }

  set(path, value) {
    const parts = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  reload() {
    console.log('🔄 Reloading configuration...');
    this.config = this.getDefaultConfig();
    this.loadConfig();
    return this.config;
  }


  dump(safe = true) {
    const configCopy = JSON.parse(JSON.stringify(this.config));
    
    if (safe) {
 
      if (configCopy.security) {
        if (configCopy.security.adminToken) {
          configCopy.security.adminToken = '***HIDDEN***';
        }
        if (configCopy.security.bypassTokens && Array.isArray(configCopy.security.bypassTokens)) {
          configCopy.security.bypassTokens = configCopy.security.bypassTokens.map(() => '***HIDDEN***');
        }
      }
    }
    
    return configCopy;
  }
}

const configManager = new ConfigManager();
console.log('✅ ConfigManager loaded');

module.exports = configManager;
