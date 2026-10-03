const base = require('./app.json');

module.exports = () => {
  const isDev = process.env.APP_VARIANT === 'development';
  const expo = {
    ...base.expo,
    name: isDev ? 'FUNY PIN DEV' : base.expo.name,
    scheme: isDev ? 'funypin-dev' : base.expo.scheme,
    ios: {
      ...base.expo.ios,
      bundleIdentifier: isDev ? 'kr.funypin.app.dev' : base.expo.ios.bundleIdentifier,
    },
    android: {
      ...base.expo.android,
      package: isDev ? 'kr.funypin.app.dev' : base.expo.android.package,
    },
    extra: {
      ...base.expo.extra,
      appVariant: isDev ? 'development' : 'production',
    },
  };
  return { expo };
};
