import dgram from "node:dgram";

let data: Float64Array;
let server: dgram.Socket;
export function createTrackerServer() {
  server = dgram.createSocket("udp4");

  server.on("error", (err) => {
    console.error(`server error:\n${err.stack}`);
    server.close();
  });

  //   server.on("message", (msg, rinfo) => {
  //     // console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

  //     // covert buffer to double array
  //     data = new Float64Array(msg.buffer, msg.byteOffset, msg.byteLength / 8);
  //   });

  server.on("listening", () => {
    const address = server.address();
    console.log(`server listening ${address.address}:${address.port}`);
  });

  server.bind(41234);
  // Prints: server listening 0.0.0.0:41234
}

export function getTrackerData() {
  return data;
}

export function getServer() {
  return server;
}
