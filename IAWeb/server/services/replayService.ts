import {
  handleUnaryCall,
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream,
} from "@grpc/grpc-js";
import { EventType } from "../common";
import { getLogsByIds, recoverFromLogs } from "../logger";
import { ReplayList, ReplayMessage, ReplayRecord, UserKey } from "../message";

let replayTimeout: { [key: string]: NodeJS.Timer } = {};

export function getReplayList(
  call: ServerUnaryCall<UserKey, ReplayList>,
  callback: sendUnaryData<ReplayList>
) {
  // const userId = call.request.getId();
  // const roomId = users[userId].roomId;
  const replayList: ReplayList = {
    records: [],
  };

  recoverFromLogs().then((logs) => {
    let pairs = new Set<string>();
    logs.forEach((log) => {
      if (log.data.userKey) {
        pairs.add(`${log.data.userKey.userId},${log.data.userKey.roomId}`);
      } else {
        // console.log("invalid log", log);
      }
    });

    pairs.forEach((pair) => {
      const _pair = pair.split(",");
      const userKey: UserKey = {
        userId: _pair[0],
        roomId: _pair[1],
        type: 0,
        viewType: 0,
      };
      let replayRecord: ReplayRecord = {
        userKey: userKey,
      };

      replayList.records.push(replayRecord);
    });
    callback(null, replayList);
  });
}
export function getReplay(
  call: ServerWritableStream<ReplayMessage, ReplayMessage>
) {
  console.log("getReplayStream");

  const userKey = call.request.userKey;
  const userId = userKey.userId;
  const roomId = userKey.roomId;
  const msg = call.request.msg;

  // start the replay
  if (msg == "start") {
    getLogsByIds(roomId, userId).then((logs) => {
      function execute(log) {
        const { event, data, timestamp } = log;
        switch (event) {
          case EventType.Join:
            break;
          case EventType.UpdateLink:
            break;
          case EventType.AddLink:
            console.log("add link at", timestamp, data);
            break;
          case EventType.AddNode:
            console.log("add node at", timestamp, data);
            break;

          case EventType.UpdateNode:
            break;
          case EventType.MergeNodes:
            break;
          case EventType.RemoveNode:
            break;
          case EventType.RemoveLink:
            break;
          case EventType.GetDocument:
            console.log("get document at", timestamp, data);
            break;

          default:
            break;
        }
      }

      function executeAll() {
        if (logs.length > 0) {
          // remove the first log and execute it
          let log = logs.shift();
          execute(log);
          // execute the next log
          if (logs.length > 0) {
            replayTimeout["replay"] = setTimeout(
              executeAll,
              logs[0].timestamp - log.timestamp
            );
          }
        }
      }

      // console.log("replaying", logs.length, "logs");
      // console.log(
      //   "time: ",
      //   convertMsToMinutesSeconds(
      //     logs[logs.length - 1].timestamp - logs[0].timestamp
      //   )
      // );

      // executeAll();

      logs.forEach((log) => {
        let userKey: UserKey = {
          userId: userId,
          roomId: roomId,
          type: 0,
          viewType: 0,
        };
        let replayMessage: ReplayMessage = {
          userKey: userKey,
          msg: JSON.stringify(log),
        };
        call.write(replayMessage);
      });
      call.end();
    });
  }

  // for all streams, send the corresponding data to the user
  // streamRoomBoardcastCalls["replay"].forEach((_call) => {});

  // callback(null, new EmptyMessage());
}
