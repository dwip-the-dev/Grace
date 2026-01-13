const EventEmitter = require('events');
const os = require('os');
const si = require('systeminformation');
const Logger = require('../utils/Logger');
const ConfigManager = require('./ConfigManager');

console.log('🔧 Loading System Monitor...');

class SystemMonitor extends EventEmitter {
  constructor() {
    super();
    this.config = ConfigManager.get('monitoring');
    this.isOverloaded = false;
    this.lastTriggered = null;
    this.intervalId = null;
    this.backendCheckInterval = null;
    this.backendHealthy = true;
    this.connections = 0;
    this.metricsHistory = [];
    this.maxHistory = 60;
    
    this.smoothedMetrics = {
      cpu: 0,
      memory: 0,
      load: 0
    };
    
    console.log('📊 Monitor thresholds:', this.config.thresholds);
    console.log('⏰ Smoothing factor:', this.config.smoothingFactor);
    console.log('🚨 Fail mode:', this.config.failMode);
  }

  applySmoothing(current, previous, alpha) {
    if (!previous || previous === 0) return current;
    return alpha * current + (1 - alpha) * previous;
  }

  async checkSystem() {
    try {
      
      const loadAvg = os.loadavg()[0]; 
      
      const [cpuData, memData] = await Promise.all([
        si.currentLoad(),
        si.mem()
      ]);

      const currentCpu = cpuData.currentLoad;
      const currentMemory = (memData.used / memData.total) * 100;
      
      
      const alpha = this.config.smoothingFactor;
      this.smoothedMetrics = {
        cpu: this.applySmoothing(currentCpu, this.smoothedMetrics.cpu, alpha),
        memory: this.applySmoothing(currentMemory, this.smoothedMetrics.memory, alpha),
        load: this.applySmoothing(loadAvg, this.smoothedMetrics.load, alpha),
        connections: this.connections,
        timestamp: Date.now()
      };

     
      this.metricsHistory.push({ ...this.smoothedMetrics });
      if (this.metricsHistory.length > this.maxHistory) {
        this.metricsHistory = this.metricsHistory.slice(-this.maxHistory);
      }

      const violations = [];
      if (this.smoothedMetrics.cpu >= this.config.thresholds.cpu) {
        violations.push(`CPU: ${this.smoothedMetrics.cpu.toFixed(1)}% >= ${this.config.thresholds.cpu}%`);
      }
      if (this.smoothedMetrics.memory >= this.config.thresholds.memory) {
        violations.push(`Memory: ${this.smoothedMetrics.memory.toFixed(1)}% >= ${this.config.thresholds.memory}%`);
      }
      if (this.smoothedMetrics.load >= this.config.thresholds.load) {
        violations.push(`Load: ${this.smoothedMetrics.load.toFixed(2)} >= ${this.config.thresholds.load}`);
      }
      
      if (!this.backendHealthy) {
        violations.push(`Backend: Unhealthy`);
      }
      
      const isOverloadedNow = violations.length > 0;

      const now = Date.now();
      if (this.lastTriggered && (now - this.lastTriggered) < this.config.cooldownPeriod) {
       
        const remainingSec = Math.ceil((this.config.cooldownPeriod - (now - this.lastTriggered)) / 1000);
        console.log(`⏳ In cooldown, ${remainingSec}s left`);
        return { 
          overloaded: true, 
          metrics: this.smoothedMetrics, 
          violations: [`In cooldown (${remainingSec}s remaining)`],
          backendHealthy: this.backendHealthy
        };
      }

     
      if (isOverloadedNow && !this.isOverloaded) {
      
        this.isOverloaded = true;
        this.lastTriggered = now;
        this.emit('overload', { 
          metrics: this.smoothedMetrics, 
          violations,
          backendHealthy: this.backendHealthy,
          timestamp: new Date().toISOString()
        });
        Logger.logOverload(this.smoothedMetrics, violations);
        console.log(`🚨 SYSTEM OVERLOAD! ${violations.join(', ')}`);
        
      } else if (!isOverloadedNow && this.isOverloaded) {
       
        this.isOverloaded = false;
        this.lastTriggered = null;
        this.emit('recovery', { 
          metrics: this.smoothedMetrics,
          backendHealthy: this.backendHealthy,
          timestamp: new Date().toISOString()
        });
        Logger.logRecovery(this.smoothedMetrics);
        console.log(`✅ SYSTEM RECOVERED`);
      }

      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 CPU: ${this.smoothedMetrics.cpu.toFixed(1)}% | RAM: ${this.smoothedMetrics.memory.toFixed(1)}% | Load: ${this.smoothedMetrics.load.toFixed(2)} | Conns: ${this.connections} | ${this.isOverloaded ? '🚨 OVERLOADED' : '✅ OK'}`);
      }
      
      return { 
        overloaded: this.isOverloaded, 
        metrics: this.smoothedMetrics, 
        violations,
        backendHealthy: this.backendHealthy
      };
      
    } catch (error) {
      console.error('❌ System check failed:', error.message);
      Logger.error('System check failed', { error: error.message });
      
      
      if (this.config.failMode === 'closed') {
        
        return { 
          overloaded: true, 
          metrics: {}, 
          violations: [`Error: ${error.message}`],
          backendHealthy: this.backendHealthy
        };
      } else {
        
        return { 
          overloaded: false, 
          metrics: {}, 
          violations: [`Error: ${error.message}`],
          backendHealthy: this.backendHealthy
        };
      }
    }
  }

 async checkBackend() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
   
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'LoadGuardian-HealthCheck/1.0'
      }
    });
    
    clearTimeout(timeout);
    this.backendHealthy = response.ok;
    
    if (!response.ok && this.backendHealthy) {
      console.log(`⚠️  Backend became unhealthy (Status: ${response.status})`);
      this.backendHealthy = false;
    } else if (response.ok && !this.backendHealthy) {
      console.log(`✅ Backend recovered`);
      this.backendHealthy = true;
    }
  } catch (error) {
    if (this.backendHealthy) {
      console.log(`⚠️  Backend check failed: ${error.message}`);
      this.backendHealthy = false;
    }
  }
}

  getStatus() {
    const now = Date.now();
    const cooldownRemaining = this.lastTriggered ? 
      Math.max(0, this.config.cooldownPeriod - (now - this.lastTriggered)) : 0;
    
    const shouldRedirect = this.isOverloaded || !this.backendHealthy;
    
    return {
      isOverloaded: this.isOverloaded,
      shouldRedirect: shouldRedirect,
      metrics: this.smoothedMetrics,
      lastTriggered: this.lastTriggered,
      cooldownRemaining: cooldownRemaining,
      cooldownRemainingSeconds: Math.ceil(cooldownRemaining / 1000),
      thresholds: this.config.thresholds,
      backendHealthy: this.backendHealthy,
      failMode: this.config.failMode,
      uptime: process.uptime(),
      historySize: this.metricsHistory.length
    };
  }

  start() {
    if (this.intervalId) {
      console.log('⚠️  Monitor is already running');
      return;
    }
    
    console.log('🚀 Starting system monitor...');
    
    
    this.checkSystem().then(() => {
      console.log('✅ Initial system check completed');
    }).catch(err => {
      console.error('❌ Initial system check failed:', err.message);
    });
    
    this.checkBackend().then(() => {
      console.log('✅ Initial backend check completed');
    }).catch(err => {
      console.error('❌ Initial backend check failed:', err.message);
    });
    
   
    this.intervalId = setInterval(() => {
      this.checkSystem();
    }, this.config.checkInterval);

    
    this.backendCheckInterval = setInterval(() => {
      this.checkBackend();
    }, 10000);

    console.log(`✅ System monitor started (checking every ${this.config.checkInterval/1000}s)`);
    return this;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.backendCheckInterval) {
      clearInterval(this.backendCheckInterval);
      this.backendCheckInterval = null;
    }
    
    console.log('🛑 System monitor stopped');
    return this;
  }

  forceOverload(state) {
    const previousState = this.isOverloaded;
    
    if (state) {
     
      this.isOverloaded = true;
      this.lastTriggered = Date.now();
      console.log(`🔄 OVERLOAD FORCED by admin (was: ${previousState ? 'overloaded' : 'normal'})`);
      this.emit('overload', { 
        metrics: this.smoothedMetrics, 
        violations: ['Forced by admin'], 
        forced: true,
        timestamp: new Date().toISOString()
      });
    } else {
    
      this.isOverloaded = false;
      this.lastTriggered = null;
      console.log(`🔄 OVERLOAD RELEASED by admin (was: ${previousState ? 'overloaded' : 'normal'})`);
      this.emit('recovery', { 
        metrics: this.smoothedMetrics, 
        forced: true,
        timestamp: new Date().toISOString()
      });
    }
    
    return this.getStatus();
  }

  incrementConnections() {
    this.connections++;
  }

  decrementConnections() {
    if (this.connections > 0) {
      this.connections--;
    }
  }

  resetConnections() {
    this.connections = 0;
  }

  getMetricsHistory() {
    return [...this.metricsHistory];
  }

  getPeakMetrics() {
    if (this.metricsHistory.length === 0) return null;
    
    return {
      maxCPU: Math.max(...this.metricsHistory.map(h => h.cpu)),
      maxMemory: Math.max(...this.metricsHistory.map(h => h.memory)),
      maxLoad: Math.max(...this.metricsHistory.map(h => h.load)),
      avgCPU: this.metricsHistory.reduce((sum, h) => sum + h.cpu, 0) / this.metricsHistory.length,
      avgMemory: this.metricsHistory.reduce((sum, h) => sum + h.memory, 0) / this.metricsHistory.length,
      avgLoad: this.metricsHistory.reduce((sum, h) => sum + h.load, 0) / this.metricsHistory.length
    };
  }
}


const monitorInstance = new SystemMonitor();

console.log('✅ Monitor instance created');


module.exports = monitorInstance;
