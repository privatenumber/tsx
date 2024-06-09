'use strict';

const isVersionGreaterOrEqual = (v1, v2) => {
  const majorDiff = v1[0] - v2[0];
  if (majorDiff === 0) {
    const minorDiff = v1[1] - v2[1];
    if (minorDiff === 0) {
      return v1[2] >= v2[2];
    }
    return minorDiff > 0;
  }
  return majorDiff > 0;
};
const currentNodeVersion = process.versions.node.split(".").map(Number);
const isFeatureSupported = (versions, current = currentNodeVersion) => {
  for (let i = 0; i < versions.length; i += 1) {
    const version = versions[i];
    if (i === versions.length - 1) {
      return isVersionGreaterOrEqual(current, version);
    }
    if (current[0] === version[0]) {
      return isVersionGreaterOrEqual(current, version);
    }
  }
  return false;
};
const moduleRegister = [
  [18, 19, 0],
  [20, 6, 0]
];
const importAttributes = [
  [18, 19, 0],
  [20, 10, 0],
  [21, 0, 0]
];
const testRunnerGlob = [
  [21, 0, 0]
];
const esmLoadReadFile = [
  [20, 11, 0],
  [21, 3, 0]
];

exports.esmLoadReadFile = esmLoadReadFile;
exports.importAttributes = importAttributes;
exports.isFeatureSupported = isFeatureSupported;
exports.moduleRegister = moduleRegister;
exports.testRunnerGlob = testRunnerGlob;
