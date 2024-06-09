import net from 'node:net';
import { g as getPipePath } from './get-pipe-path-D2pYDmQS.mjs';

const connectToServer = () => new Promise((resolve) => {
  const pipePath = getPipePath(process.ppid);
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

export { connectingToServer as c, parent as p };
