const config = require("./app.json");

module.exports = {
  ...config.expo,
  android: {
    ...config.expo.android,
    config: {
      ...config.expo.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
};
