import { r as require } from './get-pipe-path-D2pYDmQS.mjs';
import { constants } from 'node:os';
import { isMainThread } from 'node:worker_threads';
import { c as connectingToServer } from './client-Cg5Bp24g.mjs';
import './suppress-warnings.mjs';
import 'module';
import 'node:path';
import './temporary-directory-CM_Hq0H1.mjs';
import 'node:net';

const bindHiddenSignalsHandler = (signals, handler) => {
  for (const signal of signals) {
    process.on(signal, (receivedSignal) => {
      handler(receivedSignal);
      if (process.listenerCount(signal) === 0) {
        process.exit(128 + constants.signals[signal]);
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
if (isMainThread) {
  require("./cjs/index.cjs");
  (async () => {
    const sendToParent = await connectingToServer;
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
