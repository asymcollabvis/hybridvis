import {
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream,
} from "@grpc/grpc-js";
import { getCache, saveCache } from "../cache/cache";
import { EventType } from "../common";
import { documents } from "../data/data";
import { createGraph, createStatus } from "../graph/graph";
import logger, { multibar } from "../logger";
import { leaveRoom } from "../room";
import { clientTypeToString } from "../utils";
import { graphs, layouts } from "./graphService";
import {
  UserInfo,
  Room,
  EmptyMessage,
  RoomList,
  RequestById,
  UserList,
  InitialGraphData,
} from "../message";

// current state
export let users: { [roomId: string]: { [userId: string]: UserInfo } } = {};

let rooms: { [roomId: string]: Room } = {};
let usersClientDepended: {
  [roomId: string]: {
    [userId: string]: { [clientType: number]: UserInfo };
  };
} = {};
let lastUserInfo: {
  [userId: string]: { userInfo: UserInfo; interval?: NodeJS.Timer };
} = {};

let streamRoomCalls: ServerWritableStream<EmptyMessage, RoomList>[] = [];
let streamRoomUserCalls: {
  [key: string]: ServerWritableStream<RequestById, UserList>[];
} = {};

let roomList: RoomList = { rooms: [] };
// let userList = new UserList();

export function join(
  call: ServerUnaryCall<UserInfo, UserInfo>,
  callback: sendUnaryData<UserInfo>
) {
  const userInfo = call.request;

  let roomId = userInfo.roomId;
  const userId = userInfo.id;
  const clientType = userInfo.type;

  if (!roomId && userId) {
    // roomId = "__noRoom__";
    return callback(null, undefined);
  }

  // create new room
  if (roomId) {
    if (roomId in rooms) {
      let oldUserInfo = rooms[roomId].users.find((user) => user.id === userId);
      if (oldUserInfo) {
        // leave the old user ID
        leaveRoom(
          roomId,
          rooms,
          oldUserInfo,
          streamRoomUserCalls,
          users,
          lastUserInfo
        );
      }
      rooms[roomId].users.push(userInfo);
    } else {
      console.log("create new room");

      let newRoom: Room = {
        id: roomId,
        users: [userInfo],
      };
      rooms[roomId] = newRoom;
      //   roomList.setRoomsList(Object.values(rooms));
      roomList.rooms = Object.values(rooms);
      users[roomId] = {};
      usersClientDepended[roomId] = {};

      let newGraph: InitialGraphData = {};
      //   console.log(documents);

      let { graphViewData, nodes, links, layout, layout2D } = createGraph(
        getCache(roomId),
        roomId,
        documents[userInfo.dataset].length
      );
      newGraph.graphViewData = graphViewData;
      // newGraph.setNodesstatus(createStatus());
      graphs[roomId] = {
        data: newGraph,
        nodeSpatialInfos: nodes,
        links: links,
        status: createStatus(),
      };
      layouts[roomId] = {
        "3D": layout,
        "2D": layout2D,
      };

      // update nodes
      graphs[roomId].data.graphViewData.nodes.forEach((node) => {
        if (node.name === "document") {
          let docId = +node.id - 10000;
          node.createdFrom = documents[userInfo.dataset][docId].file;
        }
      });

      // cache graph data
      setInterval(() => {
        // console.log("cached graph");
        saveCache(
          roomId,
          layouts[roomId]["3D"].nodes(),
          layouts[roomId]["3D"].force("link").links()
        );
      }, 15000);

      streamRoomCalls.forEach((call) => {
        call.write(roomList);
      });

      streamRoomUserCalls[roomId] = [];
    }
    if (streamRoomUserCalls[roomId]) {
      streamRoomUserCalls[roomId].forEach((call) => {
        let _userlist: UserList = {
          users: rooms[roomId].users,
        };
        call.write(_userlist);
      });
    } else {
      streamRoomUserCalls[roomId] = [];
      console.error("streamRoomUserCalls[roomId] is null");
    }
  }

  // create new user
  if (!users[roomId][userId]) {
    lastUserInfo[userId] = { userInfo: userInfo };
    usersClientDepended[roomId][userId] = {};
  }
  if (!usersClientDepended[roomId][userId][clientType]) {
    logger.info({
      event: EventType.Join,
      data: {
        ...userInfo,
        userId: userId,
        roomId: roomId,
        type: clientType,
      },
    });
  }

  users[roomId][userId] = userInfo;
  usersClientDepended[roomId][userId][clientType] = userInfo;
  // userList.setUsersList(Object.values(users));
  // streamUserCalls.forEach((call) => {
  //   call.write(userList);
  // });

  callback(null, userInfo);
}
export function leave(
  call: ServerUnaryCall<UserInfo, EmptyMessage>,
  callback: sendUnaryData<EmptyMessage>
) {
  const userInfo = call.request;
  const roomId = userInfo.roomId;
  const userId = userInfo.id;
  const clientType = userInfo.type;

  if (roomId && userId) {
    if (roomId in rooms) {
      let usersInRoom = rooms[roomId].users;

      rooms[roomId].users = usersInRoom.filter(
        (user) => user.id != userInfo.id
      );

      // remove stream calls
      // streamRoomUserCalls = removeUserFromRoomStream(
      //   userId,
      //   roomId,
      //   streamRoomUserCalls
      // );
      // streamRoomGraphStatusCalls = removeUserFromRoomStream(
      //   userId,
      //   roomId,
      //   streamRoomGraphStatusCalls
      // );
      // streamRoomGraphCalls = removeUserFromRoomStream(
      //   userId,
      //   roomId,
      //   streamRoomGraphCalls
      // );
    }

    let streamRoomUserCall = streamRoomUserCalls[roomId];
    if (streamRoomUserCall) {
      streamRoomUserCall.forEach((call) => {
        let _userlist: UserList = {
          users: rooms[roomId].users,
        };
        call.write(_userlist);
      });
    }
  }
  if (roomId in users && userId in users[roomId]) delete users[roomId][userId];
  else console.error("user not found");

  if (lastUserInfo[userId]) {
    clearInterval(lastUserInfo[userId].interval);
    lastUserInfo[userId] = { userInfo: userInfo };
  }
  // userList.setUsersList(Object.values(users));
  // streamUserCalls.forEach((call) => {
  //   call.write(userList);
  // });

  console.log(clientTypeToString(clientType), userId, "left");
  console.log("remaining users", users[roomId] && Object.keys(users[roomId]));

  callback(null, { isRecieved: true } as EmptyMessage);
}

export function getAllUsersByRoomId(
  call: ServerWritableStream<RequestById, UserList>
) {
  console.log("getAllUsersByRoomIdStream", call.request.id);

  const roomId = call.request.id;
  if (!roomId) {
    call.end();
    return;
  }

  const usersInRoom = rooms[roomId].users;
  // console.log(usersInRoom);
  let _userlist = {
    users: usersInRoom,
  };
  call.write(_userlist);
  streamRoomUserCalls[roomId].push(call);
}

export function getAllRooms(
  call: ServerWritableStream<EmptyMessage, RoomList>
) {
  console.log("getAllRoomsStream");

  roomList.rooms = Object.values(rooms);
  call.write(roomList);
  streamRoomCalls.push(call);
}

export function updateUserStatus(
  call: ServerUnaryCall<UserInfo, EmptyMessage>,
  callback: sendUnaryData<EmptyMessage>
) {
  const userInfo = call.request;
  const userId = userInfo.id;
  const roomId = userInfo.roomId;
  const clientType = userInfo.type;

  if (!userId || !roomId || !users[roomId]) {
    callback(null, { isRecieved: false } as EmptyMessage);
    return;
  }
  users[roomId][userId] = userInfo;
  usersClientDepended[roomId][userId][clientType] = userInfo;
  // userList.setUsersList(Object.values(users));
  // streamUserCalls.forEach((call) => {
  //   call.write(userList);
  // });
  if (roomId && streamRoomUserCalls[roomId]) {
    streamRoomUserCalls[roomId].forEach((call) => {
      let _userlist: UserList = {
        users: [],
      };
      // will not update the spatial information of the users in the room
      // instead we create a new list of user using the updated user list with the id in the users in the room
      for (let id in usersClientDepended[roomId]) {
        for (let type in usersClientDepended[roomId][id]) {
          _userlist.users.push(usersClientDepended[roomId][id][type]);
        }
      }

      // _userlist.setUsersList(
      //   rooms[roomId].users.map((user) => {
      //     return users[roomId][user.id];
      //   })
      // );
      call.write(_userlist);
    });

    // console.log("logging user info", userId);
    // control bars
    // b1.increment();

    // log the simPC pose if any
    const simPcPose = userInfo.simulatedPCPose;
    if (simPcPose) {
      logger.info({
        event: EventType.SimPcPose,
        data: {
          ...simPcPose,
          userId: userId,
          roomId: roomId,
          type: clientType,
          override: false,
        },
      });
    }

    delete userInfo.simulatedPCPose;

    logger.info({
      event: EventType.UserInfo,
      data: {
        ...userInfo,
        userId: userInfo.id,
        roomId: userInfo.roomId,
        type: clientType,
      },
    });

    // if (lastUserInfo[userId]) {
    //   lastUserInfo[userId].userInfo = userInfo;
    //   if (!lastUserInfo[userId].interval) {
    //     console.log("starting interval for", userId);

    //     // log the userInfo every second
    //     logger.info({
    //       event: EventType.UserInfo,
    //       data: {
    //         ...lastUserInfo[userId].userInfo,
    //         userId: lastUserInfo[userId].userInfo.id,
    //       },
    //     });
    //     lastUserInfo[userId].interval = setInterval(() => {
    //       // console.log("logging userInfo", userId);

    //       logger.info({
    //         event: EventType.UserInfo,
    //         data: {
    //           ...lastUserInfo[userId].userInfo,
    //           userId: lastUserInfo[userId].userInfo.id,
    //         },
    //       });
    //     }, 100);
    //   }
    // }
  }
  callback(null, { isRecieved: true } as EmptyMessage);
}

// add bars
const b1 = multibar.create(100, 0, {
  filename: "User status log",
});

export function getAllUsers() {
  // userList.setUsersList(Object.values(users));
  // call.write(userList);
  // streamUserCalls.push(call);
}
