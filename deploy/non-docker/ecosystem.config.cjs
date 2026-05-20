module.exports = {
  apps: [
    {
      name: 'smart-recipe-backend',
      cwd: '/var/www/smart-recipe/backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '300M'
    }
  ]
};
