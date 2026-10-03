const base = require('./app.json');

module.exports = () => {
  const isDev = process.env.APP_VARIANT === 'development';
  const expo = {
    ...base.expo,
    name: isDev ? 'FUNY PIN DEV' : base.expo.name,
    scheme: isDev ? 'funypin-dev' : base.expo.scheme,
    icon: isDev ? './assets/app-icon-dark.png' : base.expo.icon,
    ios: {
      ...base.expo.ios,
      bundleIdentifier: isDev ? 'kr.funypin.app.dev' : base.expo.ios.bundleIdentifier,
      icon: isDev ? './assets/app-icon-dark.png' : base.expo.ios.icon,
    },
    android: {
      ...base.expo.android,
      package: isDev ? 'kr.funypin.app.dev' : base.expo.android.package,
      icon: isDev ? './assets/app-icon-dark.png' : base.expo.android?.icon,
    },
    extra: {
      ...base.expo.extra,
      appVariant: isDev ? 'development' : 'production',
    },
  };
  return { expo };
};
