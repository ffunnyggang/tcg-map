module.exports = ({ config }) => {
  const isDev = process.env.APP_VARIANT === 'development';

  return {
    ...config,
    name: isDev ? 'FUNY PIN DEV' : config.name,
    scheme: isDev ? 'funypin-dev' : config.scheme,
    icon: isDev ? './assets/app-icon-dark.png' : config.icon,
    ios: {
      ...config.ios,
      bundleIdentifier: isDev ? 'kr.funypin.app.dev' : config.ios?.bundleIdentifier,
      icon: isDev ? './assets/app-icon-dark.png' : config.ios?.icon,
    },
    android: {
      ...config.android,
      package: isDev ? 'kr.funypin.app.dev' : config.android?.package,
    },
    extra: {
      ...config.extra,
      appVariant: isDev ? 'development' : 'production',
    },
  };
};
