module.exports = {
  apps: [
    {
      name: "wordgame-api",
      script: "npm",
      args: "start",
      cwd: "/home/YOUR_USERNAME/wordgame", // Update with your actual username
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Restart delay settings to prevent rapid restart loops
      min_uptime: "10s",       // App must run for 10s to be considered stable
      max_restarts: 10,         // Max 10 restarts...
      restart_delay: 4000,      // Wait 4s between restarts
      // Logging
      error_file: "~/.pm2/logs/wordgame-api-error.log",
      out_file: "~/.pm2/logs/wordgame-api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
