import { Server, ServerCredentials } from "@grpc/grpc-js";
import { loadCache } from "./cache/cache.js";
import { init } from "./data/data.js";
import { echoServiceDefinition } from "./message.grpc-server.js";
import EchoImpl from "./services";
import { createTrackerServer } from "./tracker.js";

console.log("init");
await init();
console.log("init done");

console.log("loading cache");
let cachePromises = await loadCache();
await Promise.all(cachePromises);
console.log("loading cache done");

console.log("start udp server to receive tracker data");
createTrackerServer();

console.log("start server");
const server = new Server();
server.addService(echoServiceDefinition, EchoImpl);

const port = 9091;
const uri = `0.0.0.0:${port}`;
console.log(`Starting server on ${uri}`);
server.bindAsync(uri, ServerCredentials.createInsecure(), () => {
    server.start();
});
