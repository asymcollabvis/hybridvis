import {
  handleUnaryCall,
  Metadata,
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream,
} from "@grpc/grpc-js";
import { EventType } from "./common";
import logger, { multibar } from "./logger";
import { getServer } from "./tracker";
import {
  getAllRooms,
  getAllUsersByRoomId,
  join,
  leave,
  updateUserStatus,
  getAllUsers,
} from "./services/roomService";
import { getReplay, getReplayList } from "./services/replayService";
import {
  addNode,
  removeNode,
  addLink,
  removeLink,
  mergeNodes,
  updateLink,
  updateNode,
  getGraphData,
  getInitialGraphData,
  getLinks,
  getNodes,
  getNodesStatus,
  updateNodesStatus,
  getTimelineDataStream,
} from "./services/graphService";
import {
  getDocumentState,
  getDoument,
  updateDocumentState,
  getAllDouments,
} from "./services/documentService";
import {
  BoardcastMessage,
  EmptyMessage,
  Position,
  RequestById,
  Rotation,
  TrackerInfo,
  WebRTCAnswer,
  WebRTCOffer,
} from "./message";
// const {
//   EmptyMessage,
//   WebRTCOffer,
//   WebRTCAnswer,
//   TrackerInfo,
//   Position,
//   Rotation,
// } = pkg;

// current state
let streamRoomBoardcastCalls: {
  [key: string]: ServerWritableStream<RequestById, BoardcastMessage>[];
} = {};

// let webrtcOfferList: { [roomId: string]: string } = {};
let webrtcOfferWaitList: {
  [roomId: string]: ServerWritableStream<RequestById, WebRTCOffer>;
} = {};
// let webrtcAnswerList: { [roomId: string]: string } = {};
let webrtcAnswerWaitList: {
  [roomId: string]: ServerWritableStream<RequestById, WebRTCAnswer>;
} = {};

let webrtcOfferAnswerPair: {
  [roomId: string]: {
    offer: string;
    answer: string;
  };
} = {};

const b2 = multibar.create(100, 0, {
  filename: "Sim PC Pose log",
});

const trailers = new Metadata();

// always add some response trailers
trailers.add("server-trailer", "server trailer value");
trailers.add("server-trailer", "server trailer value duplicate");
trailers.add("server-trailer-bin", Buffer.from("server trailer binary value"));

export default {
  // room
  join, // everything start from join
  leave,
  getAllUsers,
  getAllUsersByRoomId,
  getAllRooms,
  updateUserStatus,
  // graph
  getInitialGraphData,
  getGraphData,
  getNodes,
  getLinks,
  getNodesStatus,
  updateNodesStatus,
  addNode,
  removeNode,
  updateNode,
  mergeNodes,
  addLink,
  removeLink,
  updateLink,
  getTimelineDataStream,
  // document
  getDocumentState,
  getDoument,
  updateDocumentState,
  getAllDouments,
  // message
  sendBoardcastMessage(
    call: ServerUnaryCall<BoardcastMessage, EmptyMessage>,
    callback: sendUnaryData<EmptyMessage>
  ) {
    const boardcastMessage = call.request;
    const userKey = boardcastMessage.userKey;
    const userId = userKey.userId;
    const roomId = userKey.roomId;
    const clientType = userKey.type;

    if (roomId != undefined && streamRoomBoardcastCalls[roomId] != undefined) {
      streamRoomBoardcastCalls[roomId].forEach((_call) => {
        // boardcast to others only

        if (_call.request.userKey.userId != userId) {
          // console.log(
          //   "boardcasting",
          //   boardcastMessage,
          //   "to",
          //   _call.request.userKey.userId
          // );
          _call.write(boardcastMessage);
        }
      });
    }

    logger.info({
      event: EventType.Highlight,
      data: boardcastMessage,
      userId: userId,
      roomId: roomId,
      type: clientType,
    });
    callback(null, { isRecieved: true } as EmptyMessage);
  },
  getBoardcastMessage(
    call: ServerWritableStream<RequestById, BoardcastMessage>
  ) {
    console.log("getBoardcastMessageStream");

    let roomId = call.request.id;
    if (streamRoomBoardcastCalls[roomId] == undefined) {
      streamRoomBoardcastCalls[roomId] = [];
    }
    streamRoomBoardcastCalls[roomId].push(call);
  },
  getReplayList,
  getReplay,
  setWebRTCOffer(
    call: ServerUnaryCall<RequestById, EmptyMessage>,
    callback: sendUnaryData<EmptyMessage>
  ) {
    console.log("set offer");

    const userKey = call.request.userKey;
    const roomId = userKey.roomId;
    const offer = call.request.id;

    if (!webrtcOfferAnswerPair[roomId]) {
      webrtcOfferAnswerPair[roomId] = {
        offer: "",
        answer: "",
      };
    }

    if (!webrtcOfferAnswerPair[roomId].offer) {
      webrtcOfferAnswerPair[roomId].offer = offer;
      // check if there is a call waiting
      if (webrtcOfferWaitList[roomId]) {
        const webRTCOffer: WebRTCOffer = {
          data: offer,
        };
        webrtcOfferWaitList[roomId].write(webRTCOffer);
        // webrtcOfferWaitList[roomId].end();
        // webrtcOfferWaitList[roomId] = null;
        console.log("send offer because there is a call waiting");
      }
    } else {
      console.log("offer already exist");
      // request to renew answer by ending the offer call
      webrtcOfferWaitList[roomId]?.end(trailers);
      webrtcOfferAnswerPair[roomId].answer = "";
      webrtcOfferAnswerPair[roomId].offer = "";
      webrtcOfferWaitList[roomId] = null;
    }

    callback(null, { isRecieved: true } as EmptyMessage);
  },
  getWebRTCOffer(
    call: ServerUnaryCall<RequestById, EmptyMessage>,
    callback: sendUnaryData<WebRTCOffer>
  ) {
    const userKey = call.request.userKey;
    const roomId = userKey.roomId;
    const offer = webrtcOfferAnswerPair[roomId]?.offer || "";
    const webRTCOffer: WebRTCOffer = {
      data: offer,
    };
    callback(null, webRTCOffer);
  },
  getWebRTCOfferStream(call: ServerWritableStream<RequestById, WebRTCOffer>) {
    call.on("error", (args) => {
      console.log("getWebRTCOfferStream() got error:", args);
    });

    console.log("getWebRTCOfferStream");
    const userKey = call.request.userKey;
    const roomId = userKey.roomId;

    const offer = webrtcOfferAnswerPair[roomId]?.offer || "";
    const answer = webrtcOfferAnswerPair[roomId]?.answer || "";
    if (!offer || answer) {
      // put the call to wait list

      webrtcAnswerWaitList[roomId]?.end(trailers);
      webrtcAnswerWaitList[roomId] = null;
      webrtcOfferAnswerPair[roomId] = null;
      webrtcOfferWaitList[roomId] = call;
      console.log("put the call to offer wait list");

      return;
    }
    const webRTCOffer: WebRTCOffer = {
      data: offer,
    };
    call.write(webRTCOffer);
    // call.end();
  },
  setWebRTCAnswer(
    call: ServerUnaryCall<RequestById, EmptyMessage>,
    callback: sendUnaryData<EmptyMessage>
  ) {
    console.log("set answer");

    const userKey = call.request.userKey;
    const roomId = userKey.roomId;
    const answer = call.request.id;
    if (!webrtcOfferAnswerPair[roomId]) {
      webrtcOfferAnswerPair[roomId] = {
        offer: "",
        answer: "",
      };
    }

    if (!webrtcOfferAnswerPair[roomId].answer) {
      webrtcOfferAnswerPair[roomId].answer = answer;

      // send answer if there is a call waiting
      if (webrtcAnswerWaitList[roomId]) {
        const webRTCAnswer: WebRTCAnswer = {
          data: answer,
        };
        webrtcAnswerWaitList[roomId].write(webRTCAnswer);
        // webrtcAnswerWaitList[roomId].end();
        // webrtcAnswerWaitList[roomId] = null;
        console.log("send answer because there is a call waiting");
      }
    } else {
      console.log("answer already exist");

      // request to renew offer by ending the answer call
      webrtcAnswerWaitList[roomId]?.end(trailers);
      webrtcOfferAnswerPair[roomId].offer = "";
      webrtcOfferAnswerPair[roomId].answer = "";
      webrtcAnswerWaitList[roomId] = null;
    }
    callback(null, { isRecieved: true } as EmptyMessage);
  },
  getWebRTCAnswer(
    call: ServerUnaryCall<RequestById, EmptyMessage>,
    callback: sendUnaryData<WebRTCAnswer>
  ) {
    const userKey = call.request.userKey;
    const roomId = userKey.roomId;
    const answer = webrtcOfferAnswerPair[roomId]?.answer || "";
    // console.log("getWebRTCAnswer", answer);
    const webRTCAnswer: WebRTCAnswer = {
      data: answer,
    };
    callback(null, webRTCAnswer);
  },
  getWebRTCAnswerStream(call: ServerWritableStream<RequestById, WebRTCAnswer>) {
    console.log("getWebRTCAnswerStream");

    call.on("error", (args) => {
      console.log("getWebRTCAnswerStream() got error:", args);
    });

    const userKey = call.request.userKey;
    const roomId = userKey.roomId;

    const offer = webrtcOfferAnswerPair[roomId]?.offer || "";
    const answer = webrtcOfferAnswerPair[roomId]?.answer || "";
    // console.log("getWebRTCAnswer", answer);
    if (!answer || offer) {
      // put the call to wait list
      webrtcOfferWaitList[roomId]?.end(trailers);
      webrtcOfferWaitList[roomId] = null;
      webrtcOfferAnswerPair[roomId] = null;
      webrtcAnswerWaitList[roomId] = call;
      console.log("put the call to wait list");

      return;
    }
    const webRTCAnswer: WebRTCAnswer = {
      data: answer,
    };
    call.write(webRTCAnswer);
    // call.end();
  },
  getTrackerInfoStream(call: ServerWritableStream<RequestById, TrackerInfo>) {
    // console.log("getTrackerInfoStream");
    const trackerServer = getServer();
    if (!trackerServer) {
      call.end();
      return;
    }

    getServer().on("message", (msg) => {
      // console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

      // covert buffer to double array
      // first 3 items are x, y, z coordinates, the rest are rotation
      let data = new Float64Array(
        msg.buffer,
        msg.byteOffset,
        msg.byteLength / 8
      );
      const trackerInfo: TrackerInfo = {
        trackerId: "1",
        position: {
          x: data[0],
          y: data[1],
          z: data[2],
        },
        rotation: {
          x: data[3],
          y: data[4],
          z: data[5],
          w: data[6],
        },
      };

      call.write(trackerInfo);
    });
  },
};
