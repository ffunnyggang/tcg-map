module.exports = ({ config }) => {
  const isDev = process.env.APP_VARIANT === 'development';
  const appIcon = isDev ? './assets/app-icon-dark.png' : './assets/app-icon-light.png';
  const adaptiveForeground = isDev ? './assets/android-adaptive-dark.png' : './assets/android-adaptive-light.png';
  const adaptiveBackground = isDev ? '#221662' : '#A0A6F8';

  return {
    ...config,
    name: isDev ? 'FUNY PIN DEV' : config.name,
    scheme: isDev ? 'funypin-dev' : config.scheme,
    icon: appIcon,
    ios: {
      ...config.ios,
      bundleIdentifier: isDev ? 'kr.funypin.app.dev' : config.ios?.bundleIdentifier,
      icon: isDev ? './assets/app-icon-dark.png' : config.ios?.icon,
    },
    android: {
      ...config.android,
      package: isDev ? 'kr.funypin.app.dev' : config.android?.package,
      icon: appIcon,
      config: {
        ...(config.android?.config || {}),
        googleMaps: {
          ...(config.android?.config?.googleMaps || {}),
          apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || config.android?.config?.googleMaps?.apiKey,
        },
      },
      splash: {
        image: './assets/transparent-splash.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
      adaptiveIcon: {
        ...(config.android?.adaptiveIcon || {}),
        foregroundImage: adaptiveForeground,
        backgroundColor: adaptiveBackground,
      },
    },
    extra: {
      ...config.extra,
      appVariant: isDev ? 'development' : 'production',
    },
  };
};
