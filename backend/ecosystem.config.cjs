module.exports = {
  apps: [
    {
      name: 'deaa-hub',
      script: './dist/main.js',
      instances: 'max',         // one per CPU core
      exec_mode: 'cluster',     // PM2 cluster mode — shared port, OS distributes
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Zero-downtime reload: pm2 reload deaa-hub
      wait_ready: false,
      listen_timeout: 10000,
      kill_timeout: 5000,
      // Auto-restart on crash
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10,
      // Logging
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
