module.exports = {
  apps: [{
    name: 'bridge',
    script: 'index.js',
    node_args: [
      '--inspect'
    ],
    pmx: false,
    watch: true,
    ignore_watch: [
      'databases',
      'node_modules',
      '*.swp',
      '.*.swp',
      '*.md'
    ],
    env: {
      LOG_LEVEL: 'debug',
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy: {
    production: {
      user: 'rommel',
      host: '127.0.0.1',
      ref: 'origin/master',
      repo: 'git@github.com:michaelrommel/pwd-racetrack.git',
      path: '/tmp/nodejs/pwd-bridge',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
}
