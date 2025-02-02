import { ServerWritableStream } from "@grpc/grpc-js";
import { clientTypeToString } from "./utils.js";
import { Room, UserInfo, RequestById, UserList } from "./message.js";

export function leaveRoom(
  roomId: string,
  rooms: { [roomId: string]: Room },
  userInfo: UserInfo,
  streamRoomUserCalls: {
    [key: string]: ServerWritableStream<RequestById, UserList>[];
  },
  users: {
    [roomId: string]: {
      [userId: string]: UserInfo;
    };
  },
  lastUserInfo: {
    [userId: string]: {
      userInfo: UserInfo;
      interval?: NodeJS.Timer;
    };
  }
) {
  const userId = userInfo.id;
  if (roomId) {
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
  delete users[roomId][userId];
  if (lastUserInfo[userId]) {
    clearInterval(lastUserInfo[userId].interval);
    lastUserInfo[userId] = { userInfo: userInfo };
  }
  // userList.setUsersList(Object.values(users));
  // streamUserCalls.forEach((call) => {
  //   call.write(userList);
  // });

  console.log(clientTypeToString(userInfo.type), userId, "left");
  console.log("remaining users", Object.keys(users[roomId]));
}
