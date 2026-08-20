// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

/**
 * Code partagé avec l'application web — voir shared/README.md.
 *
 * Metro ne suit que les fichiers sous la racine du projet : sans `watchFolders`,
 * une modification dans `shared/` ne déclencherait aucun rechargement, et
 * l'import échouerait à la résolution.
 */
const partage = path.resolve(__dirname, '..', 'shared');

config.watchFolders = [...(config.watchFolders ?? []), partage];

config.resolver = {
  ...config.resolver,
  // `shared/` n'a pas de node_modules : les dépendances éventuelles doivent
  // être résolues depuis celles du projet mobile.
  nodeModulesPaths: [
    ...(config.resolver.nodeModulesPaths ?? []),
    path.resolve(__dirname, 'node_modules'),
  ],
  extraNodeModules: {
    ...(config.resolver.extraNodeModules ?? {}),
    '@partage': partage,
  },
};

module.exports = config;
