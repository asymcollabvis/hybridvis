import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import {
  DocInfo,
  setDocInfos,
  setDocumentContent,
  setDocumentState,
} from "../features/document/documentSlice";
import {
  GLink,
  setAllSelectedNodeIds,
  setLinks,
  setNodes,
  setNodesRaw,
} from "../features/graph/graphSlice";
import {
  setNearCursorNodes,
  setUserList,
  setUserSpatialInfo,
} from "../features/room/roomSlice";
import { selectUser, setBoardcastMessage } from "../features/user/userSlice";
import { useAppDispatch, useAppSelector } from "../hooks";
import store from "../store";
import {
  useDocumentsStore,
  useGraphStore,
  useTimelineStore,
} from "../stores/store";
import {
  pushStatus,
  streamBoardcastMessage,
  streamDocumentState,
  streamGraph,
  streamGraphStatus,
  streamNodes,
  streamTimelineData,
  streamUserList,
  useClient,
} from "./client";
import { constructUserKeyFromUser } from "./helper";
import {
  UserList,
  DocumentState,
  RequestById,
  InitialRequest,
  NodeList,
  UserInfo,
  GraphViewData,
  ServerNodesStatus,
  BoardcastMessage,
  DocumentList,
  Document,
  IdList,
  TimelineData,
  InitialRequest_ClientViewType,
} from "./message";

export default function useRoomStream(
  graphType: InitialRequest_ClientViewType
) {
  const dispatch = useAppDispatch();
  const selector = useAppSelector;
  const { setDocumentId } = useDocumentsStore();
  const setSelectedNodeIds = useGraphStore((state) => state.setSelectedNodeIds);
  const user = selector(selectUser);
  const client = useClient();
  const _setNodes = useGraphStore((state) => state.setNodes);
  const _setLinks = useGraphStore((state) => state.setLinks);
  const get = useThree((state) => state.get);
  const setData = useTimelineStore((state) => state.setData);
  // const addData = useTimelineStore((state) => state.addData);

  console.log("use room stream");

  // let stream: ServerStreamingCall<RequestById, UserList>;
  // let documentStateStream: ServerStreamingCall<DocumentState>;
  // let nodesStream: ServerStreamingCall<NodeList>;
  // let graphStream: ServerStreamingCall<GraphViewData>;
  // let graphStatusStream: ServerStreamingCall<ServerNodesStatus>;
  // let boardcastMessageStream: ServerStreamingCall<BoardcastMessage>;
  // let timelineDataStream: ServerStreamingCall<TimelineData>;

  const streamUserListCallback = (response: UserList) => {
    let newList = response.users;
    if (store.getState().room.userList.length != newList.length) {
      dispatch(setUserList(newList));

      // TODO:  remove the removed users in the user spatial info map
    }

    newList.forEach((_user) => {
      // deprecated
      if (_user.id == user?.id && _user.override) {
        console.log("override");
        const _control = get().controls;
        const _camera = get().camera;

        if (!_control || !_camera) {
          return;
        }
        (_control as any).target.set(
          _user.headSpatialInfo?.position?.x || 0,
          _user.headSpatialInfo?.position?.y || 0,
          4
        );
        _camera.position.set(
          _user.headSpatialInfo?.position?.x || 0,
          _user.headSpatialInfo?.position?.y || 0,
          4
        );

        // push back the latest status to server
        _user.override = false;
        pushStatus(_user, _camera);
      }

      const spatialInfo = _user.headSpatialInfo;
      const frustum = _user.frustum;
      const cursor = _user.nearCursorNodeIds;
      const cursorWeight = _user.nearCursorNodeWeights;

      let nodes: { nodeId: number; weight: number }[] = [];
      for (let i = 0; i < cursor.length; i++) {
        nodes.push({ nodeId: +cursor[i], weight: cursorWeight[i] });
      }
      // console.log("near cursor nodes: ", { userId: _user.id+_user.type, nodes });

      dispatch(setNearCursorNodes({ userId: _user.id + _user.type, nodes }));

      if (spatialInfo) {
        dispatch(
          setUserSpatialInfo({
            id: _user.id + _user.type,
            spatialInfo,
            frustum,
          })
        );
      }
    });
  };

  useEffect(() => {
    console.log("user changed room");

    if (user && user.roomId) {
      let roomId = user.roomId;
      // get user list of specific room from the server
      // if (stream) {
      //   // cancel the current stream if any
      //   stream.cancel();
      // }

      streamUserList(user, streamUserListCallback);

      // get document state of specific room from the server
      // if (documentStateStream) {
      //   // cancel the current stream if any
      //   documentStateStream.cancel();
      // }

      streamDocumentState(user, (response) => {
        console.log("stream document state", response);
        dispatch(setDocumentState(response));

        if (!user || !roomId) return;

        let targetDocId: string | null = null;
        Object.entries(response.documentStates).forEach(
          ([docId, readByList]) => {
            if (readByList.ids.includes(user.id)) targetDocId = docId;
          }
        );

        // fetch new document content when the document id is changed
        // console.log(
        //   "target doc id",
        //   targetDocId,
        //   store.getState().document.documentId
        // );

        // HACK: (not sure) current check will increase the logging in backend if missing => targetDocId == store.getState().document.documentId
        if (targetDocId == undefined) return;

        // const request: RequestById = {
        //   id: targetDocId,
        //   userKey: constructUserKeyFromUser(user),
        // };
        setDocumentId(+targetDocId, false);
      });

      // get graph data
      // if (graphStream) {
      //   // cancel the current stream if any
      //   graphStream.cancel();
      // }

      streamGraph(user, (response) => {
        console.log("graph data updated", response);

        const rawNodes = response.nodes ?? [];
        dispatch(setNodesRaw(rawNodes));
        _setNodes(rawNodes);

        let _links: GLink[] = (response.links ?? []).map((link) => {
          return {
            source: link.source,
            target: link.target,
            data: link.data,
            id: link.id,
            documentId: link.createdFrom,
            createdFrom: link.createdFrom,
            createdBy: link.createdBy,
          };
        });
        dispatch(setLinks(_links));
        _setLinks(_links);
      });

      // get graph node spatial data
      // if (nodesStream) {
      //   // cancel the current stream if any
      //   nodesStream.cancel();
      // }

      streamNodes(user, graphType, (response) => {
        dispatch(
          setNodes(
            response.spatialInfos.map((v) => {
              let spatial = v.spatialInfo!;
              return [
                spatial.position?.x ?? 0,
                spatial.position?.y ?? 0,
                spatial.position?.z ?? 0,
              ];
            })
          )
        );
      });

      // get graph status
      // if (graphStatusStream) {
      //   // cancel the current stream if any
      //   graphStatusStream.cancel();
      // }

      streamGraphStatus(user, (response) => {
        let allSelectedNodes: {
          id: number;
          userId: string;
        }[] = [];
        let selectedNodes: number[] = [];

        Object.entries(response.hightlighted).forEach(([userId, node]) => {
          if (userId == user?.id) {
            selectedNodes = node.highlighted;
          } else {
            node.highlighted.forEach((id) => {
              allSelectedNodes.push({
                id,
                userId,
              });
            });
          }
        });

        dispatch(setAllSelectedNodeIds(allSelectedNodes));

        setSelectedNodeIds(selectedNodes);
      });

      // if (boardcastMessageStream) {
      //   // cancel the current stream if any
      //   boardcastMessageStream.cancel();
      // }
      // boardcastMessageStream = streamBoardcastMessage(
      //   roomId,
      //   user!.id,
      //   (response) => {
      //     dispatch(setBoardcastMessage(response.toObject()));
      //   }
      // );

      getDocuments();

      // timeline data stream
      // if (timelineDataStream) {
      //   // cancel the current stream if any
      //   timelineDataStream.cancel();
      // }

      streamTimelineData(user, (response) => {
        console.log("timeline data", response);
        // dispatch(setTimelineData(response));
        // setData(response.toObject());
        let _data: { [key: string]: string[] } = {};
        Object.entries(response.data).forEach(([key, value]) => {
          _data[key] = value.ids;
        });
        setData(_data);
      });
    }
  }, [user?.roomId]);

  const getDocuments = () => {
    console.log("getDocuments stream");
    if (!user) return;

    const userId = user.id;
    let userKey = constructUserKeyFromUser(user);

    let request: RequestById = {
      id: userId,
      userKey,
    };
    const stream = client.getAllDouments(request, {});

    new Promise(async (resolve, reject) => {
      for await (let res of stream.responses) {
        let list = res.documents;
        // console.log("documents", list.length);

        let docInfos: DocInfo[] = [];

        list.forEach((doc) => {
          let targetDocId = +doc.id;

          // reuse the request object
          request.id = doc.id;
          request.userKey = userKey;
          client.getDoument(request).then((value) => {
            let res: Document = value.response;
            dispatch(
              setDocumentContent({
                id: targetDocId,
                content: res.content,
                // .trim()
                // .replace(/\n *(\w)/g, "$1")
                // .replace(/\n/g, "\n\n"),
              })
            );
          });

          docInfos.push({
            id: doc.id,
            title: doc.title,
            author: doc.author,
            date: doc.date,
            fileName: doc.fileName,
          });
        });

        dispatch(setDocInfos(docInfos));
      }
    })
      .then(() => {
        console.log("getDocuments Stream ended");
        // getDocuments();
      })
      .catch((err) => {
        console.log("getDocuments", err);
      });
  };

  // useEffect(() => {
  //   getDocuments();
  // }, []);
}
