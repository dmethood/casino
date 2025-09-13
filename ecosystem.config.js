// Licensed Casino Platform - PM2 Production Configuration
// Enterprise-grade process management for licensed casino operation

module.exports = {
  apps: [
    {
      name: 'casino-platform',
      script: 'npm',
      args: 'start',
      cwd: '/app',
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        APP_ENV: 'production'
      },
      
      // Resource Management
      max_memory_restart: '2G',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_file: './logs/casino-platform.log',
      out_file: './logs/casino-platform-out.log',
      error_file: './logs/casino-platform-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring
      watch: false, // Disable in production
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
      
      // Auto-restart configuration
      autorestart: true,
      restart_delay: 5000, // 5 seconds
      
      // Health monitoring
      health_check_grace_period: 30000, // 30 seconds
      health_check_fatal_exceptions: true,
      
      // Security
      kill_timeout: 10000, // 10 seconds graceful shutdown
      wait_ready: true,
      listen_timeout: 30000,
      
      // Advanced settings
      source_map_support: false,
      disable_source_map_support: true,
      
      // Production optimizations
      node_args: [
        '--max-old-space-size=2048',
        '--optimize-for-size'
      ],
      
      // Process management
      increment_var: 'PORT',
      
      // Post-deployment hooks
      post_update: ['npm run migrate', 'npm run compliance:check'],
      
      // Metadata
      instance_var: 'INSTANCE_ID',
      
      // Error handling
      exp_backoff_restart_delay: 100,
      
      // Monitoring integrations
      pmx: process.env.NODE_ENV === 'production',
      
      // Resource limits (optional)
      max_memory_restart: '2G',
      
      // Custom startup script
      interpreter: 'node',
      interpreter_args: '--experimental-loader ts-node/esm'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: process.env.DEPLOY_USER || 'casino',
      host: process.env.DEPLOY_HOST || 'localhost',
      ref: 'origin/main',
      repo: process.env.DEPLOY_REPO || 'git@github.com:casino/licensed-casino-platform.git',
      path: process.env.DEPLOY_PATH || '/var/www/casino-platform',
      
      // Pre-deployment commands
      'pre-deploy': [
        'git fetch --all',
        'npm run compliance:check',
        'npm run backup:manual'
      ].join(' && '),
      
      // Post-deployment commands  
      'post-deploy': [
        'npm ci --production',
        'npx prisma generate',
        'npm run build',
        'npm run migrate',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save'
      ].join(' && '),
      
      // Pre-setup commands (first deployment)
      'pre-setup': [
        'apt-get update',
        'apt-get install -y postgresql-client redis-tools openssl',
        'npm install -g pm2'
      ].join(' && '),
      
      // Environment
      env: {
        NODE_ENV: 'production',
        APP_ENV: 'production'
      }
    }
  }
};
