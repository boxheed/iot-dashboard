// Device validation utilities
export {
  DEVICE_TYPE_CONFIGS,
  isValidDeviceType,
  isValidDeviceStatus,
  validateDeviceProperty,
  validateDeviceControl,
  validateDevice,
  validateThreshold,
  validateDeviceCommand,
  validateDeviceRegistration,
} from './deviceValidation';

// Device transformation utilities
export {
  formatPropertyValue,
  getDeviceTypeName,
  getDeviceTypeIcon,
  getCommonPropertiesForType,
  getCommonControlsForType,
  transformRawDeviceData,
  createDeviceProperty,
  createDeviceControl,
  updateDeviceProperty,
  getDevicePropertyValue,
  getDeviceControl,
  validateControlValue,
  deviceCommandToMqttMessage,
  parseMqttToDeviceProperty,
  calculateDeviceHealthScore,
  groupDevicesByRoom,
  filterDevicesByType,
  sortDevices,
} from './deviceTransform';

// Input validation utilities
export {
  validateControlInput,
  validateSwitchInput,
  validateSliderInput,
  validateSelectInput,
  validateTextInput,
  validateDeviceName,
  validateRoomName,
  validateTemperature,
  validatePercentage,
  validateBrightness,
  validateMqttTopic,
  validateIpAddress,
  validatePort,
} from './inputValidation';

// Re-export validation result types
export type { ValidationResult } from './deviceValidation';
export type { InputValidationResult } from './inputValidation';
