import store from "../store";
import {
  computeGraphSpatialInfo,
  computeUserFrustum,
  computeUserSpatialInfo,
} from "./awareness";
import { EchoServiceClient } from "./message.client";
import {
  BoardcastMessage,
  BoardcastMessage_Action,
  DocumentState,
  GraphViewData,
  InitialRequest,
  InitialRequest_ClientViewType,
  Position,
  NodeList,
  RequestById,
  Rotation,
  Scale,
  SpatialInfo,
  TimelineData,
  UserInfo,
  UserInfo_ClientType,
  UserKey,
  UserList,
  ServerNodesStatus,
} from "./message";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import * as THREE from "three";
import * as d3 from "d3";
import { constructUserKeyFromUser } from "./helper";

let client: EchoServiceClient;
let simPcObj: THREE.Object3D | null = null;
let tempVector = new THREE.Vector3();
let tempQuaternion = new THREE.Quaternion();

function initConnection(
  type: UserInfo_ClientType,
  dataset: string,
  roomId?: string,
  userId?: string
) {
  console.log("init connection");

  if (!import.meta.env.VITE_BASE_URL) {
    throw new Error("BASE_URL is not set");
  }
  if (!client) {
    let transport = new GrpcWebFetchTransport({
      baseUrl: `${import.meta.env.VITE_BASE_URL}:${
        import.meta.env.VITE_SERVER_PORT
      }`,
    });

    client = new EchoServiceClient(transport);
  }

  let userInfo: UserInfo = {
    id: new Date().getTime().toString(),
    type: type,
    roomId: "",
    documentId: "",
    dataset: dataset,
    nearCursorNodeIds: [],
    nearCursorNodeWeights: [],
    override: false,
    headTowardsObject: "",
  };

  if (userId) {
    userInfo.id = userId;
  }
  if (roomId) {
    userInfo.roomId = roomId;
  }

  return new Promise<UserInfo>((resolve, reject) => {
    client
      .join(userInfo)
      .then((value) => {
        resolve(value.response);
      })
      .catch((err) => {
        console.error(err);
        reject(err);
      });
  });
}

function initReplyConnection() {
  console.log("init connection");

  if (!import.meta.env.VITE_BASE_URL) {
    throw new Error("BASE_URL is not set");
  }
  if (!client) {
    let transport = new GrpcWebFetchTransport({
      baseUrl: `${import.meta.env.VITE_BASE_URL}:${
        import.meta.env.VITE_SERVER_PORT
      }`,
    });

    client = new EchoServiceClient(transport);
  }
  return client;
}

function joinRoom(userInfo: UserInfo, roomId: string) {
  userInfo.roomId = roomId;

  return new Promise<UserInfo>((resolve, reject) => {
    client.join(userInfo).then((value) => {
      let response = value.response;
      // console.log(err, response);
      resolve(response);
    });
  });
}

function useClient() {
  return client;
}

function leave() {
  console.log("leave");
  const user = store.getState().user.userInfo;
  if (user) {
    client.leave(user);
  } else {
    console.error("user is not set");
  }
}

function pushStatus(
  user: UserInfo | null,
  camera: THREE.Camera,
  graph?: THREE.Object3D,
  documentPanel?: THREE.Object3D,
  tempVector = new THREE.Vector3(),
  tempQuaternion = new THREE.Quaternion(),
  lookAt?: string
) {
  if (!(user && user.roomId)) return;

  let frustum = computeUserFrustum(camera, graph, tempVector);
  let spatialInfo = computeUserSpatialInfo(
    camera,
    graph,
    tempVector,
    tempQuaternion
  );

  const nodesNearbyCursor = store.getState().user.nodesNearbyCursor;

  // simPcObj

  let simPcObjPose = simPcObj
    ? computeSimPcPose(simPcObj, tempVector, tempQuaternion)
    : undefined;

  let newUser: UserInfo = {
    ...user,
    frustum: frustum,
    headSpatialInfo: spatialInfo,
    graphSpatialInfo: computeGraphSpatialInfo(graph),
    documentPanelSpatialInfo: computeGraphSpatialInfo(documentPanel),
    nearCursorNodeIds: nodesNearbyCursor.map((node) => `${node.nodeId}`),
    nearCursorNodeWeights: nodesNearbyCursor.map((node) => node.weight),
    headTowardsObject: lookAt || "",
    simulatedPCPose: simPcObjPose,
  };

  client.updateUserStatus(newUser).then((value) => {
    if (user.override) console.log("update user status override success");
  });
}

function computeSimPcPose(
  simPcObj: THREE.Object3D,
  tempVector = new THREE.Vector3(),
  tempQuaternion = new THREE.Quaternion()
) {
  tempVector.setFromMatrixPosition(simPcObj.matrixWorld);
  tempQuaternion.setFromRotationMatrix(simPcObj.matrixWorld);

  const spatialInfo: SpatialInfo = {
    position: {
      x: tempVector.x,
      y: tempVector.y,
      z: tempVector.z,
    },
    rotation: {
      x: tempQuaternion.x,
      y: tempQuaternion.y,
      z: tempQuaternion.z,
      w: tempQuaternion.w,
    },
    scale: {
      x: 1,
      y: 1,
      z: 1,
    },
  };
  return spatialInfo;
}

export function setSimPcObj(obj: THREE.Object3D) {
  simPcObj = obj;
}

// export function pushSimPCPose(
//   simPcObj: THREE.Object3D,
//   tempVector = new THREE.Vector3(),
//   tempQuaternion = new THREE.Quaternion(),
//   simPcPose = {} as SimulatedPCPose
// ) {
//   const user = store.getState().user.userInfo;
//   if (!user) {
//     console.error("user is not set");
//     return;
//   }

//   tempVector.setFromMatrixPosition(simPcObj.matrixWorld);
//   tempQuaternion.setFromRotationMatrix(simPcObj.matrixWorld);
//   const spatialInfo = simPcPose.spatialInfo;

//   if (!spatialInfo) {
//     console.error("spatialInfo is not set");
//     return;
//   }
//   const position = spatialInfo.position;
//   if (!position) {
//     console.error("position is not set");
//     return;
//   }
//   const rotation = spatialInfo.rotation;
//   if (!rotation) {
//     console.error("rotation is not set");
//     return;
//   }
//   position.x = tempVector.x;
//   position.y = tempVector.y;
//   position.z = tempVector.z;
//   rotation.x = tempQuaternion.x;
//   rotation.y = tempQuaternion.y;
//   rotation.z = tempQuaternion.z;
//   rotation.w = tempQuaternion.w;

//   client.updateSimPcPose(simPcPose);
// }

function streamUserList(
  user: UserInfo,
  callback: (respoence: UserList) => void
) {
  console.log("stream user list");
  const roomId = user.roomId;
  const userKey: UserKey = {
    userId: user.id,
    roomId: roomId,
    type: user.type,
    viewType: InitialRequest_ClientViewType.VIEW_2D,
  };

  let request: RequestById = {
    userKey: userKey,
    id: roomId,
  };
  let stream = client.getAllUsersByRoomId(request);
  new Promise<void>(async (resolve, reject) => {
    try {
      for await (const response of stream.responses) {
        callback(response);
      }
    } catch (error) {
      reject(new Error("Whoops! getAllUsersByRoomId"));
    }

    resolve();
  })
    .then(() => {
      console.log("Stream ended");
      streamUserList(user, callback);
    })
    .catch((err) => {
      console.log("Stream error: " + err);
      streamUserList(user, callback);
    });
  return stream;
}

function streamDocumentState(
  user: UserInfo,
  callback: (response: DocumentState) => void
) {
  console.log("stream document state");
  let request: RequestById = {
    userKey: constructUserKeyFromUser(user),
    id: user.roomId,
  };
  let stream = client.getDocumentState(request, {});

  new Promise<void>(async (resolve, reject) => {
    try {
      for await (const response of stream.responses) {
        callback(response);
      }
    } catch (error) {
      reject(new Error("Whoops! getDocumentState"));
    }

    resolve();
  })
    .then(() => {
      console.log("Stream ended");
      streamDocumentState(user, callback);
    })
    .catch((err) => {
      console.log("Stream error: " + err);
      streamDocumentState(user, callback);
    });
  return stream;
}

function streamGraph(
  user: UserInfo,
  callback: (response: GraphViewData) => void
) {
  console.log("stream graph");
  let request: RequestById = {
    userKey: constructUserKeyFromUser(user),
    id: user.roomId,
  };
  let stream = client.getGraphData(request, {});
  // console.log("stream graph test", stream);

  new Promise<void>(async (resolve, reject) => {
    try {
      for await (const response of stream.responses) {
        callback(response);
      }
    } catch (error) {
      reject(new Error("Whoops! getGraphData"));
    }

    resolve();
  })
    .then(() => {
      console.log("Stream ended");
      streamGraph(user, callback);
    })
    .catch((err) => {
      console.log("Stream error: " + err);
      streamGraph(user, callback);
    });
  return stream;
}

function streamNodes(
  user: UserInfo,
  graphType: InitialRequest_ClientViewType,
  callback: (response: NodeList) => void
) {
  console.log("stream nodes");

  let initialRequest: InitialRequest = {
    userKey: constructUserKeyFromUser(user),
    requestedViewType: graphType,
  };

  let stream = client.getNodes(initialRequest, {});
  new Promise<void>(async (resolve, reject) => {
    try {
      for await (const response of stream.responses) {
        callback(response);
      }
    } catch (error) {
      reject(new Error("Whoops! getNodes"));
    }

    resolve();
  })
    .then(() => {
      console.log("Stream ended");
      streamNodes(user, graphType, callback);
    })
    .catch((err) => {
      console.log("Stream error: " + err);
      streamNodes(user, graphType, callback);
    });
  return stream;
}

function streamGraphStatus(
  user: UserInfo,
  callback: (response: ServerNodesStatus) => void
) {
  console.log("stream graph state");

  let request: RequestById = {
    userKey: constructUserKeyFromUser(user),
    id: user.roomId,
  };

  let stream = client.getNodesStatus(request, {});
  new Promise<void>(async (resolve, reject) => {
    try {
      for await (const response of stream.responses) {
        callback(response);
      }
    } catch (error) {
      reject(new Error("Whoops! getNodeStatus"));
    }

    resolve();
  })
    .then(() => {
      console.log("Stream ended");
      streamGraphStatus(user, callback);
    })
    .catch((err) => {
      console.log("Stream error: " + err);
      streamGraphStatus(user, callback);
    });
  return stream;
}

function streamBoardcastMessage(
  user: UserInfo,
  callback: (response: BoardcastMessage) => void
) {
  console.log("stream boardcast messages");

  // let request: RequestById = {
  //   userKey: constructUserKeyFromUser(user),
  //   id: user.roomId,
  // }
  // let stream = client.getBoardcastMessage(request, {});
  // return new Promise<void>(async (resolve, reject) => {
  //   for await (const response of stream.responses) {
  //     callback(response);
  //   }
  //   resolve();
  // }).then(() => {
  //   console.log("Stream ended");
  //   streamBoardcastMessage(user, callback);
  // }).catch((err) => {
  //   console.log("Stream error: " + err);
  // });
}

function sendMessage(
  user: UserInfo,
  message: string,
  actionType: BoardcastMessage_Action
) {
  // const userKey = constructUserKeyFromUser(user);
  // let msg = new BoardcastMessage();
  // msg.setUserkey(userKey);
  // msg.setMsg(message);
  // msg.setAction(actionType);
  // client.sendBoardcastMessage(msg, {}, (err, response) => {
  //   console.log(err, response);
  // });
}

function streamTimelineData(
  user: UserInfo,
  callback: (response: TimelineData) => void
) {
  console.log("stream timeline data");

  const userKey = constructUserKeyFromUser(user);
  let request: RequestById = {
    userKey: userKey,
    id: "",
  };
  let stream = client.getTimelineDataStream(request, {});
  new Promise<void>(async (resolve, reject) => {
    try {
      for await (const response of stream.responses) {
        callback(response);
      }
    } catch (error) {
      reject(new Error("Whoops! getTimelineDataStream"));
    }

    resolve();
  })
    .then(() => {
      console.log("Stream ended");
      streamTimelineData(user, callback);
    })
    .catch((err) => {
      console.log("Stream error: " + err);
      streamTimelineData(user, callback);
    });
  return stream;
}

export {
  initConnection,
  initReplyConnection,
  joinRoom,
  useClient,
  leave,
  pushStatus,
  streamUserList,
  streamDocumentState,
  streamGraph,
  streamGraphStatus,
  streamNodes,
  streamBoardcastMessage,
  sendMessage,
  streamTimelineData,
};

const colorScale = d3.scaleOrdinal(d3.schemeAccent);
export function getUserColor(uid: string) {
  colorScale.domain(store.getState().room.userList.map((u) => u.id));
  return colorScale(uid);
}
