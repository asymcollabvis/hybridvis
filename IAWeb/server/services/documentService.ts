import {
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream,
} from "@grpc/grpc-js";
import { EventType } from "../common";
import { DocumentData, documents } from "../data/data";
import logger from "../logger";

import { clientTypeToString } from "../utils";
import { users } from "../services/roomService";
import {
  DocumentState,
  RequestById,
  EmptyMessage,
  IdList,
  DocumentList,
  Document,
} from "../message";

// history state
let userDocumentHistory: { [userId: string]: string } = {};

// current state
let roomDocumentStates: { [roomId: string]: DocumentState } = {};
let streamRoomDocumentCalls: {
  [key: string]: ServerWritableStream<RequestById, DocumentState>[];
} = {};

export function getDocumentState(
  call: ServerWritableStream<RequestById, DocumentState>
) {
  console.log("getDocumentStateStream");

  const roomId = call.request.id;

  // save the state and call for later use
  if (!streamRoomDocumentCalls[roomId]) {
    streamRoomDocumentCalls[roomId] = [];
  }
  streamRoomDocumentCalls[roomId].push(call);

  if (roomDocumentStates[roomId] == undefined) {
    const documentState: DocumentState = {
      documentStates: {},
    };
    roomDocumentStates[roomId] = documentState;
  }
  call.write(roomDocumentStates[roomId]);
}
export function getDoument(
  call: ServerUnaryCall<RequestById, Document>,
  callback: sendUnaryData<Document>
) {
  const userKey = call.request.userKey;
  const userId = userKey.userId;
  const roomId = userKey.roomId;
  const clientType = userKey.type;

  const docId = call.request.id;
  console.log(userId, "in", roomId, "getDocument", docId);

  const user = users[roomId][userId];

  const doc: DocumentData = documents[user.dataset][docId];
  const { title, author, content, date, file } = doc;
  const document: Document = {
    id: docId,
    title: title,
    author: author,
    content: content,
    date: date,
    fileName: file,
  };

  logger.info({
    event: EventType.GetDocument,
    data: {
      userKey,
      fileName: file,
      userId: userId,
      roomId: roomId,
      docid: docId,
      type: clientType,
    },
  });

  callback(null, document);
}
export function updateDocumentState(
  call: ServerUnaryCall<RequestById, EmptyMessage>,
  callback: sendUnaryData<EmptyMessage>
) {
  const userKey = call.request.userKey;
  const userId = userKey.userId;
  const roomId = userKey.roomId;
  const clientType = userKey.type;

  const docId = call.request.id;
  console.log(userId, "in", roomId, "updateDocument", docId);

  if (!users[roomId] || !users[roomId][userId]) return;

  const user = users[roomId][userId];
  user.documentId = docId;

  if (roomId && roomDocumentStates[roomId]) {
    let state = roomDocumentStates[roomId].documentStates;

    // remove the user from the previous readBy list
    let prevDocumentId = userDocumentHistory[userId];
    if (prevDocumentId) {
      console.log(
        "removing user from previous readBy list",
        userId,
        prevDocumentId
      );

      let prevReadBy = state[prevDocumentId] ?? ({ ids: [] } as IdList);
      prevReadBy.ids = prevReadBy.ids.filter((id) => id != userId);
      state[prevDocumentId] = prevReadBy;
    }
    userDocumentHistory[userId] = docId;

    let readBy = state[docId] ?? ({ ids: [] } as IdList);
    readBy.ids.push(userId);
    state[docId] = readBy;
    streamRoomDocumentCalls[roomId].forEach((call) => {
      // console.log(
      //   "writing document state",
      //   roomDocumentStates[roomId]
      // );

      call.write(roomDocumentStates[roomId]);
    });
  }

  const doc: DocumentData = documents[user.dataset][docId];
  const { file } = doc;

  logger.info({
    event: EventType.GetDocument,
    data: {
      userKey,
      fileName: file,
      userId: userId,
      roomId: roomId,
      docid: docId,
      type: clientType,
    },
  });

  callback(null, { isRecieved: true } as EmptyMessage);
}
export function getAllDouments(
  call: ServerWritableStream<RequestById, DocumentList>
) {
  const userKey = call.request.userKey;
  const userId = userKey.userId;
  const roomId = userKey.roomId;
  const clientType = userKey.type;
  const user = users[roomId][userId];
  console.log(userId, roomId, clientTypeToString(clientType), "getAllDouments");

  let documentList: DocumentList = {
    documents: documents[user.dataset].map((document, i) => {
      const { title, author, content, date, file } = document;

      return {
        id: `${i}`,
        title: title,
        author: author,
        content: content,
        date: date,
        fileName: file,
      };
    }),
  };
  call.write(documentList);
  // streamDocumentCalls.push(call);
  call.end();
}
