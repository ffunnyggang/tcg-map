const base = require('./app.json').expo;

module.exports = ({ config }) => ({
  ...config,
  ...base,
  android: {
    ...config.android,
    ...base.android,
    config: {
      ...config.android?.config,
      ...base.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
});
