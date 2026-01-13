require('dotenv').config();

console.log('🚀 Starting Load Guardian...');
console.log('='.repeat(60));
console.log('📁 Directory:', process.cwd());
console.log('🌐 NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('='.repeat(60));

function validateSecrets() {
  console.log('🔒 Validating security configuration...');
  
  const requiredSecrets = ['ADMIN_TOKEN', 'BYPASS_TOKENS'];
  const warnings = [];
  const errors = [];
  
  for (const secret of requiredSecrets) {
    const value = process.env[secret];
    
    if (!value || value.trim() === '') {
      errors.push(`❌ ${secret} is not set`);
    } else if (value.includes('CHANGE_THIS') || value.includes('default') || value.includes('test_token')) {
      warnings.push(`⚠️  ${secret} appears to be using a default/weak value`);
    } else if (value.length < 16 && secret.includes('TOKEN')) {
      warnings.push(`⚠️  ${secret} is shorter than 16 characters (weak)`);
    }
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  SECURITY WARNINGS:');
    warnings.forEach(w => console.log(w));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ CRITICAL ERRORS:');
    errors.forEach(e => console.log(e));
    console.log('\n💀 Please update your .env file with secure values!');
    process.exit(1);
  }
  
  if (warnings.length === 0 && errors.length === 0) {
    console.log('✅ Security configuration validated');
  }
}

validateSecrets();


let isShuttingDown = false;

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error(error.stack);
  

  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  Continuing in production mode despite error');

  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);

});

let gatewayInstance = null;

async function shutdown(signal) {
  if (isShuttingDown) {
    console.log(`⚠️  Already shutting down, ignoring ${signal}`);
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  try {
    if (gatewayInstance) {
      await gatewayInstance.stop();
    }
    
    console.log('✅ Load Guardian stopped gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}


process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));


process.on('exit', (code) => {
  if (code !== 0) {
    console.error(`⚠️  Process exiting with code: ${code}`);
  }
});


async function start() {
  try {
    const Gateway = require('./src/core/Gateway');
    gatewayInstance = new Gateway();
    
    await gatewayInstance.start();
    
    console.log('\n🚀 Load Guardian successfully started!');
    console.log('📈 Monitoring system metrics...');
    console.log('🛡️  Protecting backend services...');
    
  } catch (error) {
    console.error('❌ Failed to start Load Guardian:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}


if (require.main === module) {
  start();
}

module.exports = { start, shutdown };
