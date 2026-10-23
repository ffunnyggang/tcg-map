module.exports = ({ config }) => {
  const isDev = process.env.APP_VARIANT === 'development';
  const fs = require('fs');
  const localGoogleServices = isDev ? './google-services.dev.json' : './google-services.prod.json';
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(localGoogleServices) ? localGoogleServices : undefined);
  if (googleServicesFile && fs.existsSync(googleServicesFile)) {
    const firebase = JSON.parse(fs.readFileSync(googleServicesFile, 'utf8'));
    const expectedPackage = isDev ? 'kr.funypin.app.dev' : config.android?.package;
    if (!firebase.client?.some(client => client.client_info?.android_client_info?.package_name === expectedPackage)) {
      throw new Error('Firebase configuration does not contain Android package: ' + expectedPackage);
    }
  }
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
      ...(googleServicesFile ? { googleServicesFile } : {}),
      icon: appIcon,
      config: {
        ...(config.android?.config || {}),
        googleMaps: {
          ...(config.android?.config?.googleMaps || {}),
          apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || config.android?.config?.googleMaps?.apiKey,
        },
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
