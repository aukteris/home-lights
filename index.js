var Accessory = require('./HAP-NodeJS/lib/Accessory.js').Accessory;
var Bridge = require('./HAP-NodeJS/lib/Bridge.js').Bridge;
var Service = require('./HAP-NodeJS/lib/Service.js').Service;
var Characteristic = require('./HAP-NodeJS/lib/Characteristic.js').Characteristic;
var uuid = require('./HAP-NodeJS/lib/util/uuid');
var AccessoryLoader = require('./HAP-NodeJS/lib/AccessoryLoader.js');
var storage = require('node-persist');

// ensure Characteristic subclasses are defined
var HomeKitTypes = require('./HAP-NodeJS/lib/gen/HomeKitTypes');

module.exports = {
  init: init,
  Accessory: Accessory,
  Bridge: Bridge,
  Service: Service,
  Characteristic: Characteristic,
  uuid: uuid,
  AccessoryLoader: AccessoryLoader
}

function init(storagePath) {
  // initialize our underlying storage system, passing on the directory if needed
  if (typeof storagePath !== 'undefined')
    storage.initSync({ dir: storagePath });
  else
    storage.initSync(); // use whatever is default
}