// ui/next.config.js
module.exports = {
  reactStrictMode: true,
  // Allow importing files from the sibling src directory
  webpack: (config) => {
    config.resolve.alias['@src'] = require('path').resolve(__dirname, '../src');
    return config;
  },
};
