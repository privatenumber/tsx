'use strict';

var net = require('node:net');
var getPipePath = require('./get-pipe-path-BRzkrjmO.cjs');

const connectToServer = () => new Promise((resolve) => {
  const pipePath = getPipePath.getPipePath(process.ppid);
  const socket = net.createConnection(
    pipePath,
    () => {
      const sendToParent = (data) => {
        const messageBuffer = Buffer.from(JSON.stringify(data));
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeInt32BE(messageBuffer.length, 0);
        socket.write(Buffer.concat([lengthBuffer, messageBuffer]));
      };
      resolve(sendToParent);
    }
  );
  socket.on("error", () => {
    resolve();
  });
  socket.unref();
});
const parent = {
  send: void 0
};
const connectingToServer = connectToServer();
connectingToServer.then(
  (send) => {
    parent.send = send;
  },
  () => {
  }
);

exports.connectingToServer = connectingToServer;
exports.parent = parent;
