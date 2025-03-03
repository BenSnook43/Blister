const { getDataConnect, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'blister-web',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

