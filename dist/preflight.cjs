'use strict';

var getPipePath = require('./get-pipe-path-BRzkrjmO.cjs');
var os = require('node:os');
var node_worker_threads = require('node:worker_threads');
var client = require('./client-D05RSYSD.cjs');
require('./suppress-warnings.cjs');
require('module');
require('node:path');
require('./temporary-directory-dlKDKQR6.cjs');
require('node:net');

const bindHiddenSignalsHandler = (signals, handler) => {
  for (const signal of signals) {
    process.on(signal, (receivedSignal) => {
      handler(receivedSignal);
      if (process.listenerCount(signal) === 0) {
        process.exit(128 + os.constants.signals[signal]);
      }
    });
  }
  const { listenerCount, listeners } = process;
  process.listenerCount = function(eventName) {
    let count = Reflect.apply(listenerCount, this, arguments);
    if (signals.includes(eventName)) {
      count -= 1;
    }
    return count;
  };
  process.listeners = function(eventName) {
    const result = Reflect.apply(listeners, this, arguments);
    if (signals.includes(eventName)) {
      return result.filter((listener) => listener !== handler);
    }
    return result;
  };
};
if (node_worker_threads.isMainThread) {
  getPipePath.require("./cjs/index.cjs");
  (async () => {
    const sendToParent = await client.connectingToServer;
    if (sendToParent) {
      bindHiddenSignalsHandler(["SIGINT", "SIGTERM"], (signal) => {
        sendToParent({
          type: "signal",
          signal
        });
      });
    }
  })();
}
