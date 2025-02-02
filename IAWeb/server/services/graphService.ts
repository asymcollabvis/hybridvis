import {
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream,
} from "@grpc/grpc-js";
import { EventType } from "../common";
import { documents } from "../data/data";
import {
  addLinkToGraph,
  createLinkForce,
  getNodesSpatialInfo,
  precomputeUpdatedLinks,
} from "../graph/graph";
import logger from "../logger";

import { computeTimelineData } from "../timeline/timeline";
import { users } from "./roomService";
import {
  ClientActions,
  EmptyMessage,
  GraphViewData,
  HighlightedList,
  InitialGraphData,
  InitialRequest,
  Link,
  LinkList,
  NodeSpatialInfo,
  RequestById,
  ServerNodesStatus,
  TimelineData,
  NodeList,
  InitialRequest_ClientViewType,
  Node,
} from "../message";

// current state
export const graphs: {
  [roomId: string]: {
    data: InitialGraphData;
    nodeSpatialInfos: NodeList;
    links: LinkList;
    status: ServerNodesStatus;
  };
} = {};
export const layouts: {
  [roomId: string]: {
    "3D": any;
    "2D": any;
  };
} = {};
const timelineData: {
  [roomId: string]: TimelineData;
} = {};
const streamRoomGraphCalls: {
  [key: string]: ServerWritableStream<RequestById, GraphViewData>[];
} = {};
const streamRoomGraphStatusCalls: {
  [key: string]: ServerWritableStream<RequestById, ServerNodesStatus>[];
} = {};
const streamTimelineDataCalls: {
  [roomId: string]: ServerWritableStream<RequestById, TimelineData>[];
} = {};
const streamRoomNodesCalls: {
  [key: string]: {
    0: ServerWritableStream<InitialRequest, NodeList>[];
    1: ServerWritableStream<InitialRequest, NodeList>[];
  };
} = {};

//#region graph
export function getInitialGraphData(
  call: ServerUnaryCall<InitialRequest, InitialGraphData>,
  callback: sendUnaryData<InitialGraphData>
): void {
  // console.log("getInitialGraphData", call.request.requestedViewType);
  // console.log(users[call.request.userId]);
  // if (
  //   users[call.request.userId] &&
  //   users[call.request.userId].roomId
  // ) {
  //   const initialGraphData =
  //     graphs[users[call.request.userId].roomId];
  //   const graphViewData = initialGraphData.data.graphViewData;
  //   let layout;
  //   if (
  //     call.request.requestedViewType ===
  //     InitialRequest_ClientViewType.VIEW_3D
  //   ) {
  //     layout = layouts[users[call.request.userId].roomId]["3D"];
  //   } else if (
  //     call.request.requestedViewType ===
  //     InitialRequest_ClientViewType.VIEW_2D
  //   ) {
  //     layout = layouts[users[call.request.userId].roomId]["2D"];
  //   }
  //   updateGraph(
  //     layout,
  //     graphViewData!,
  //     createSpatialInfo([0, 0, 0], [0, 0, 0, 0], [1, 1, 1])
  //   );
  //   callback(null, initialGraphData.data);
  // } else {
  //   callback(null, new InitialGraphData());
  // }
}
export function getGraphData(
  call: ServerWritableStream<RequestById, GraphViewData>
) {
  let roomId = call.request.id;
  if (roomId) {
    console.log("getGraphDataStream room id:", roomId);
    const graph = graphs[roomId];
    call.write(graph.data.graphViewData, (err) => {
      if (err) console.log("getGraphDataStream err", err);
    });

    let storedCall = streamRoomGraphCalls[roomId];
    if (!storedCall) {
      storedCall = [];
      streamRoomGraphCalls[roomId] = storedCall;
    }
    storedCall.push(call);
  } else {
    call.end();
  }
}
//#endregion

//#region node
export function getNodes(call: ServerWritableStream<InitialRequest, NodeList>) {
  console.log("getNodesStream", call.request.userKey);

  const roomId = call.request.userKey.roomId;
  const userId = call.request.userKey.userId;

  if (
    roomId &&
    userId &&
    users[roomId][userId] &&
    users[roomId][userId].roomId
  ) {
    const graph = graphs[roomId];
    let layout;
    let viewType = call.request.requestedViewType;
    if (viewType === InitialRequest_ClientViewType.VIEW_3D) {
      layout = layouts[users[roomId][userId].roomId]["3D"];
    } else if (viewType === InitialRequest_ClientViewType.VIEW_2D) {
      layout = layouts[users[roomId][userId].roomId]["2D"];
    }

    // write graph data first because the graph might be stable and not ticked when call
    call.write(getNodesSpatialInfo(layout, graph.nodeSpatialInfos));
    // console.log(layout.nodes());

    let storedCall = streamRoomNodesCalls[roomId];
    if (!storedCall) {
      storedCall = { 0: [], 1: [] };
      streamRoomNodesCalls[roomId] = storedCall;
    }
    streamRoomNodesCalls[roomId][viewType].push(call);

    // update ontick function
    layout.on("tick", () => {
      streamRoomNodesCalls[roomId][viewType].forEach((_call) => {
        _call.write(getNodesSpatialInfo(layout, graph.nodeSpatialInfos));
      });
    });
  } else {
    call.end();
  }
}
export function addNode(
  call: ServerUnaryCall<Node, Node>,
  callback: sendUnaryData<Node>
) {
  const node = call.request;
  const roomId = node.roomId;
  const userKey = node.userKey;
  const clientType = userKey.type;

  if (!roomId) {
    console.log("ERROR: no room id");

    return callback(null, node);
  }

  let graphViewData = graphs[roomId].data.graphViewData;

  // update datatype
  if (Date.parse(node.data)) {
    console.log("update datatype", node.data);

    node.dataType = "date";
  }

  const lastItem = graphViewData.nodes.at(-1);
  const nextId = lastItem ? +lastItem.id + 1 : 0;
  node.id = `${nextId}`;
  logger.info({
    event: EventType.AddNode,
    data: {
      ...node,
      userId: node.updatedBy,
      roomId: roomId,
      type: clientType,
    },
  });

  graphViewData.nodes.push(node);
  graphs[roomId].nodeSpatialInfos.spatialInfos.push({
    id: node.id,
    roomId: roomId,
  });
  const graphNode: {
    id: number;
    data: string;
    name: string;
    createdBy: string;
    createdFrom: string;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    dataType?: string;
  } = {
    id: +node.id,
    data: node.data,
    name: node.name,
    createdBy: node.createdBy,
    createdFrom: node.createdFrom,
    dataType: node.dataType,
  };
  let spatialInfo = node.spatialInfo;
  if (spatialInfo) {
    let position = spatialInfo.position;

    let x = position.x;
    let y = position.y;
    let z = position.z;

    if (x != undefined) {
      graphNode.x = x;
      graphNode.vx = 0;
    }
    if (y != undefined) {
      graphNode.y = y;
      graphNode.vy = 0;
    }
    if (z != undefined) {
      graphNode.z = z;
      graphNode.vz = 0;
    } else {
      graphNode.z = 0;
      graphNode.vz = 0;
    }
  }
  // console.log("adding node", graphNode);

  // create document link
  console.log("before create document link", graphViewData.links.at(-1));
  let targetLayouts = layouts[roomId];
  if (node.createdFrom !== "-1" || node.createdFrom !== undefined) {
    let user = users[roomId][node.createdBy];
    let docNodeId =
      documents[user.dataset].findIndex((doc) => doc.file == node.createdFrom) +
      10000;
    console.log("creating document link", docNodeId, node.id);
    let link: Link = {
      source: +docNodeId,
      target: +node.id,
      roomId: roomId,
      createdBy: node.createdBy,
      updatedBy: node.updatedBy,
      data: "",
      name: "",
      id: "",
      createdFrom: "",
    };

    addLinkToGraph(
      userKey,
      roomId,
      graphViewData,
      link,
      timelineData,
      streamTimelineDataCalls
    );
    console.log("after create document link", graphViewData.links.at(-1));
  }

  targetLayouts["3D"]
    .nodes([...targetLayouts["3D"].nodes(), { ...graphNode }])
    .force(
      "link",
      createLinkForce(JSON.parse(JSON.stringify(graphViewData.links)))
    )
    .alpha(5)
    .restart();
  console.log("after targetLayouts 3D restart", graphViewData.links.at(-1));

  // generate 2D layout from 3D coordinates
  let newNodes = [...targetLayouts["2D"].nodes(), { ...graphNode }].map(
    (n, i) => {
      return {
        ...n,
        x: targetLayouts["2D"].nodes()[i]?.x ?? n.x,
        y: targetLayouts["2D"].nodes()[i]?.y ?? n.y,
      };
    }
  );

  // console.log("adding node 2D", newNodes);

  targetLayouts["2D"]
    .nodes(newNodes)
    .force(
      "link",
      createLinkForce(JSON.parse(JSON.stringify(graphViewData.links)))
    )
    .alpha(5)
    .restart();

  streamRoomGraphCalls[roomId].forEach((call) => {
    call.write(graphViewData);
    console.log("write graph data", graphViewData.links.at(-1));
  });
  callback(null, node);
}
export function updateNode(
  call: ServerUnaryCall<Node, EmptyMessage>,
  callback: sendUnaryData<EmptyMessage>
) {
  const newNode = call.request;
  const roomId = newNode.roomId;
  const userKey = newNode.userKey;
  const clientType = userKey.type;
  if (!roomId) {
    console.log("ERROR: no room id");
    return callback(null, { isRecieved: false } as EmptyMessage);
  }

  console.log("updating node in room", roomId);

  // cannot update document node
  console.log("newNode", newNode);

  if (newNode.name == "document") {
    console.log("reject update document node");

    callback(null, { isRecieved: false } as EmptyMessage);
    return;
  }

  // update graph data
  const graphViewData = graphs[newNode.roomId].data.graphViewData;
  const nodeList = graphViewData.nodes;

  const nodeIndex = nodeList.findIndex((n) => n.id === newNode.id);

  // move the node if the spatial info is set
  let spatialInfo = newNode.spatialInfo;
  if (spatialInfo) {
    let position = spatialInfo.position;

    // update layout node position
    let layout3D = layouts[roomId]["3D"];
    let layout2D = layouts[roomId]["2D"];

    let x = position.x;
    let y = position.y;
    let z = position.z;

    let targetNode3D = layout3D.nodes().find((n) => n.id === +newNode.id);

    if (!targetNode3D) {
      return;
    }

    if (x) {
      targetNode3D.x = x;
      targetNode3D.vx = 0;
    }
    if (y) {
      targetNode3D.y = y;
      targetNode3D.vy = 0;
    }
    if (z) {
      targetNode3D.z = z;
      targetNode3D.vz = 0;
    } else {
      // do not update z but reset the velocity
      targetNode3D.vz = 0;
    }

    let targetNode2D = layout2D.nodes().find((n) => n.id === +newNode.id);

    if (!targetNode2D) {
      return;
    }

    if (x) {
      targetNode2D.x = x;
      targetNode2D.vx = 0;
    }
    if (y) {
      targetNode2D.y = y;
      targetNode2D.vy = 0;
    }

    layout3D.alpha(5).restart();
    layout2D.alpha(5).restart();

    // reset spatial info
    newNode.spatialInfo = undefined;

    console.log("move node");
  }

  nodeList[nodeIndex] = newNode;

  graphViewData.nodes = nodeList;
  layouts[roomId]["3D"].nodes().find((n) => n.id === +newNode.id).data =
    newNode.data;
  layouts[roomId]["2D"].nodes().find((n) => n.id === +newNode.id).name =
    newNode.name;

  // update graph data to client first
  streamRoomGraphCalls[roomId].forEach((call) => {
    call.write(graphViewData);
  });
  logger.info({
    event: EventType.UpdateNode,
    data: {
      ...newNode,
      userId: newNode.updatedBy,
      roomId: roomId,
      type: clientType,
    },
  });
  callback(null, { isRecieved: true } as EmptyMessage);
}
export function mergeNodes(
  call: ServerUnaryCall<NodeList, EmptyMessage>,
  callback: sendUnaryData<EmptyMessage>
) {
  console.log("mergeNodes", call.request);
  const userKey = call.request.userKey;
  const clientType = userKey.type;
  const userId = userKey.userId;
  const roomId = userKey.roomId;

  const nodeList = call.request;
  const graph = graphs[roomId].data;
  const nodeSpatialInfos = graphs[roomId].nodeSpatialInfos;
  const graphViewData = graph.graphViewData;
  const allNodeIds = nodeList.spatialInfos.map((node) => +node.id);

  // cannot merge document node
  for (let id of allNodeIds) {
    let node = graphViewData.nodes.find((n) => +n.id == id);
    if (node.name == "document") {
      console.log("reject merge document node");
      callback(null, { isRecieved: false } as EmptyMessage);
      return;
    }
  }

  const mergedNode = nodeList.spatialInfos[0];
  const mergedNodeId = +mergedNode.id;
  const otherNodeIds = nodeList.spatialInfos.slice(1).map((node) => +node.id);

  let nodes = graphViewData.nodes;
  let links = graphViewData.links;
  // delete links between this node and all other to-be-merged node if any
  links = precomputeUpdatedLinks(
    roomId,
    nodes,
    links,
    (l) => !(l.source == mergedNodeId && allNodeIds.includes(l.target)),
    timelineData,
    streamTimelineDataCalls
  );
  // links = links.filter(
  //   (l) =>
  //     !(l.source == mergedNodeId && allNodeIds.includes(l.target))
  // );

  let nodesConnectedToMergedNode: number[] = [];
  let linksConnectedToMergedNode: Link[] = [];
  links.forEach((l) => {
    if (l.source == mergedNodeId) {
      nodesConnectedToMergedNode.push(l.target);
      linksConnectedToMergedNode.push(l);
    } else if (l.target == mergedNodeId) {
      nodesConnectedToMergedNode.push(l.source);
      linksConnectedToMergedNode.push(l);
    }
  });

  let layout2DNodes = layouts[roomId]["2D"].nodes();
  let layout3DNodes = layouts[roomId]["3D"].nodes();
  otherNodeIds.forEach((nodeId) => {
    const nodeIndex = nodes.findIndex((n) => +n.id == nodeId);
    if (nodeIndex == -1) {
      throw new Error("node not found");
    }
    // delete links between this node and all other to-be-merged node if any
    // links = links.filter(
    //   (l) => !(l.source == nodeId && allNodeIds.includes(l.target))
    // );
    links = precomputeUpdatedLinks(
      roomId,
      nodes,
      links,
      (l: Link) => !(l.source == nodeId && allNodeIds.includes(l.target)),
      timelineData,
      streamTimelineDataCalls
    );

    // look for links with common target or source with this node
    // if found, merge the data
    // if not found, change the source or target to the merged node
    links.forEach((l) => {
      if (l.source == nodeId) {
        if (nodesConnectedToMergedNode.includes(l.target)) {
          // @ts-ignore
          l._toBeDeleted = true;
          const oldLink = linksConnectedToMergedNode.find((l2) => {
            return l2.target == l.target || l2.source == l.target;
          });
          oldLink.data = `${oldLink.data}; ${l.data}`;
        }
        l.source = mergedNodeId;
      } else if (l.target == nodeId) {
        if (nodesConnectedToMergedNode.includes(l.source)) {
          // @ts-ignore
          l._toBeDeleted = true;
          const oldLink = linksConnectedToMergedNode.find((l2) => {
            return l2.source == l.source || l2.target == l.source;
          });
          oldLink.data = `${oldLink.data}; ${l.data}`;
        }
        l.target = mergedNodeId;
      }
    });

    // delete old nodes
    nodes.splice(nodeIndex, 1);
    let spatialInfos = nodeSpatialInfos.spatialInfos;
    spatialInfos.splice(nodeIndex, 1);
    nodeSpatialInfos.spatialInfos = spatialInfos;
    layout2DNodes = layout2DNodes.filter((n) => +n.id != nodeId);
    layout3DNodes = layout3DNodes.filter((n) => +n.id != nodeId);
  });

  // delete links that are to be deleted
  // @ts-ignore
  links = links.filter((l) => !l._toBeDeleted);
  // links = precomputeUpdatedLinks(
  //   nodes,
  //   links,
  //   (l: Link & { _toBeDeleted: boolean }) => !l._toBeDeleted,
  //   timelineData,
  //   streamTimelineDataCalls
  // );

  // console.log(
  //   "mergeNodes",
  //   nodes.map((n) => n),
  //   JSON.parse(JSON.stringiflinks))
  // );

  // console.log("layoutNodes", layout2DNodes, layout3DNodes);

  graphViewData.nodes = nodes;
  graphViewData.links = links;

  // update graph data to client first
  streamRoomGraphCalls[roomId].forEach((call) => {
    call.write(graphViewData);
  });

  // update layouts
  const layout2D = layouts[roomId]["2D"];
  const layout3D = layouts[roomId]["3D"];
  layout3D
    .nodes(layout3DNodes)
    .force("link", createLinkForce(JSON.parse(JSON.stringify(links))))
    .alpha(5)
    .restart();
  layout2D
    .nodes(layout2DNodes)
    .force("link", createLinkForce(JSON.parse(JSON.stringify(links))))
    .alpha(5)
    .restart();

  logger.info({
    event: EventType.MergeNodes,
    data: nodeList,
    userId: userId,
    roomId: roomId,
    type: clientType,
  });

  // HACK: lazy hack to recompute the timeline data
  timelineData[roomId] = {
    data: {},
  };
  const roomTimelineData = timelineData[roomId];
  computeTimelineData(roomTimelineData, links, nodes);

  streamTimelineDataCalls[roomId].forEach((call) => {
    call.write(roomTimelineData);
  });

  callback(null, { isRecieved: true } as EmptyMessage);
}
export function removeNode(
  call: ServerUnaryCall<Node, EmptyMessage>,
  callback: sendUnaryData<EmptyMessage>
) {
  const userKey = call.request.userKey;
  const clientType = userKey.type;

  const node = call.request;
  const roomId = node.roomId;
  if (!roomId) {
    console.log("ERROR: room id not found");

    return callback(null, { isRecieved: false } as EmptyMessage);
  }

  const graph = graphs[node.roomId].data;
  const graphViewData = graph.graphViewData;
  const nodeSpatialInfos = graphs[node.roomId].nodeSpatialInfos;
  let nodes = graphViewData.nodes;
  const nodeId = node.id;

  console.log("removeNode", node);

  // cannot remove document node
  if (node.name == "document") {
    console.log("cannot remove document node");

    callback(null, { isRecieved: false } as EmptyMessage);
    return;
  }

  // update link list first
  // delete links that are connected to this node
  let links = graphViewData.links;
  // links = links.filter(
  //   (l) => l.target != +nodeId && l.source != +nodeId
  // );
  links = precomputeUpdatedLinks(
    roomId,
    nodes,
    links,
    (l: Link) => l.target != +nodeId && l.source != +nodeId,
    timelineData,
    streamTimelineDataCalls
  );
  graphViewData.links = links;
  // graph.setGraphviewdata(graphViewData);

  // update node list
  const nodeIndex = nodes.findIndex((n) => n.id == nodeId);
  if (nodeIndex == -1) {
    console.log("node not found");
    return;
  }
  nodes.splice(nodeIndex, 1);
  logger.info({
    event: EventType.RemoveNode,
    data: {
      ...node,
      userId: node.updatedBy,
      roomId: node.roomId,
      type: clientType,
    },
  });
  graphViewData.nodes = nodes;

  // update node spatial info list
  let spatialInfos = nodeSpatialInfos.spatialInfos;
  const spatialInfoIndex = spatialInfos.findIndex((n) => n.id == nodeId);
  if (spatialInfoIndex == -1) {
    console.log("ERROR: spatialInfoIndex not found", nodeId);
    return;
  }
  spatialInfos.splice(spatialInfoIndex, 1);
  nodeSpatialInfos.spatialInfos = spatialInfos;

  // update layouts
  console.log("removing node", node.id);

  const layout2D = layouts[node.roomId]["2D"];
  const layout3D = layouts[node.roomId]["3D"];

  layout3D
    .nodes(layout3D.nodes().filter((n) => n.id != nodeId))
    .force("link", createLinkForce(JSON.parse(JSON.stringify(links))))
    .alpha(5)
    .restart();
  layout2D
    .nodes(layout2D.nodes().filter((n) => n.id != nodeId))
    .force("link", createLinkForce(JSON.parse(JSON.stringify(links))))
    .alpha(5)
    .restart();
  // console.log("removing node", node.id);
  // console.log(layout3D.nodes());
  // console.log(
  //   graph
  //     .graphViewData
  //     .nodes
  //     .map((n) => n)
  // );

  // update node status
  const nodeStatus = graphs[node.roomId].status;

  let newStatus: { [key: string]: number[] } = {};
  Object.entries(nodeStatus.hightlighted).forEach(([key, value]) => {
    newStatus[key] = value.highlighted.filter((id) => id != +nodeId);
  });
  for (const key in newStatus) {
    const element = newStatus[key];

    nodeStatus.hightlighted[key] = {
      highlighted: element,
    };
  }

  streamRoomGraphStatusCalls[node.roomId].forEach((call) => {
    call.write(nodeStatus);
  });

  streamRoomGraphCalls[node.roomId].forEach((call) => {
    call.write(graphViewData);
  });

  console.log("removeNode done");

  callback(null, { isRecieved: true } as EmptyMessage);
}
export function getNodesStatus(
  call: ServerWritableStream<RequestById, ServerNodesStatus>
) {
  console.log("getNodesStatusStream", call.request.id);

  let roomId = call.request.id;
  if (roomId) {
    const status = graphs[roomId].status;
    call.write(status);

    let storedCall = streamRoomGraphStatusCalls[roomId];
    if (!storedCall) {
      storedCall = [];
      streamRoomGraphStatusCalls[roomId] = storedCall;
    }
    storedCall.push(call);
  } else {
    call.end();
  }
}
export function updateNodesStatus(
  call: ServerUnaryCall<ClientActions, ServerNodesStatus>,
  callback: sendUnaryData<ServerNodesStatus>
) {
  const userKey = call.request.userKey;
  const roomId = userKey.roomId;
  const userId = userKey.userId;
  const clientType = userKey.type;
  if (roomId && userId) {
    // const graph = graphs[roomId].data;
    const serverNodesStatus = graphs[roomId].status;
    let highlightedList: HighlightedList = {
      highlighted: call.request.clickedNodes,
    };
    serverNodesStatus.hightlighted[userId] = highlightedList;

    streamRoomGraphStatusCalls[roomId].forEach((call) => {
      call.write(serverNodesStatus);
    });

    logger.info({
      event: EventType.UpdateNodesStatus,
      data: {
        ...serverNodesStatus,
        userId: userId,
        roomId: roomId,
        type: clientType,
      },
    });

    callback(null, serverNodesStatus);
  } else {
    callback(null, {} as ServerNodesStatus);
  }
}
//#endregion

//#region link
export function getLinks() {
  // TODO: implement
  // however, we can get links using getGraphData
}
export function addLink(
  call: ServerUnaryCall<Link, EmptyMessage>,
  callback: sendUnaryData<EmptyMessage>
) {
  const link = call.request;
  const roomId = link.roomId;
  const userKey = link.userKey;
  const clientType = userKey.type;

  if (!roomId) return callback(null, { isRecieved: false } as EmptyMessage);
  const graphViewData = graphs[roomId].data.graphViewData;
  console.log(link);

  if (link.id) {
    // update link
    const linkIndex = graphViewData.links.findIndex((l) => l.id == link.id);
    console.log("found link index", linkIndex);

    const linkList = graphViewData.links;
    if (linkIndex != -1) {
      console.log("update link");
      logger.info({
        event: EventType.UpdateLink,
        data: {
          ...link,
          userId: link.updatedBy,
          roomId: roomId,
          type: clientType,
        },
      });

      linkList[linkIndex] = link;
      graphViewData.links = linkList;
    }
  } else {
    // reject if both source and target are documents
    let nodes = graphViewData.nodes;
    let sourceNode = nodes.find((n) => +n.id == link.source);
    let targetNode = nodes.find((n) => +n.id == link.target);
    if (sourceNode.name == "document" && targetNode.name == "document") {
      console.log("reject link");
      callback(null, { isRecieved: false } as EmptyMessage);
      return;
    }

    // new link
    addLinkToGraph(
      userKey,
      roomId,
      graphViewData,
      link,
      timelineData,
      streamTimelineDataCalls
    );
  }

  const links = graphViewData.links;
  layouts[roomId]["3D"]
    .force("link", createLinkForce(JSON.parse(JSON.stringify(links))))
    .alpha(5)
    .restart();
  layouts[roomId]["2D"]
    .force("link", createLinkForce(JSON.parse(JSON.stringify(links))))
    .alpha(5)
    .restart();

  streamRoomGraphCalls[roomId].forEach((call) => {
    call.write(graphViewData);
  });
  callback(null, { isRecieved: true } as EmptyMessage);
}
export function updateLink() {
  // @deprecated (we don't use this anymore, we update link in addLink)
}
export function removeLink(
  call: ServerUnaryCall<Link, EmptyMessage>,
  callback: sendUnaryData<EmptyMessage>
) {
  const userKey = call.request.userKey;
  const clientType = userKey.type;

  const link = call.request;
  const roomId = link.roomId;
  if (!roomId) {
    return callback(null, { isRecieved: false } as EmptyMessage);
  }

  const graph = graphs[roomId].data;
  const graphViewData = graph.graphViewData;
  const nodes = graphViewData.nodes;

  // update link list
  let links = graphViewData.links;
  const linkIndex = links.findIndex((l) => l.id == link.id);
  if (linkIndex == -1) {
    console.log("link not found");
    return;
  }
  const removedLink = links.splice(linkIndex, 1)[0];
  logger.info({
    event: EventType.RemoveLink,
    data: {
      ...link,
      userId: link.updatedBy,
      roomId,
      type: clientType,
    },
  });
  graphViewData.links = links;
  graph.graphViewData = graphViewData;

  // update timeline data
  // check if the data type of the nodes in the removed link is date
  let timeNode = nodes.find((n) => n.id == `${removedLink.source}`);
  let valueNode = nodes.find((n) => n.id == `${removedLink.target}`);
  if (timeNode.dataType != "date") {
    if (valueNode.dataType != "date") {
      timeNode = null;
      valueNode = null;
    } else {
      // swap
      const temp = timeNode;
      timeNode = valueNode;
      valueNode = temp;
    }
  }

  if (timeNode && valueNode) {
    // remove the timeline data
    const roomTimelineData = timelineData[roomId];
    if (!roomTimelineData) {
      console.log("room timeline data not found", roomId);
      return;
    }
    const dataMap = roomTimelineData.data;
    const values = dataMap[timeNode.data];
    // console.log(values.ids, valueNode.id);

    const _v = values.ids;

    _v.splice(values.ids.indexOf(`${valueNode.id}`), 1);
    // console.log(newValues);

    values.ids = _v;
    dataMap[timeNode.data] = values;

    streamTimelineDataCalls[roomId].forEach((call) => {
      call.write(roomTimelineData);
    });
  }

  // update layouts
  const layout2D = layouts[roomId]["2D"];
  const layout3D = layouts[roomId]["3D"];
  layout3D
    .force("link", createLinkForce(JSON.parse(JSON.stringify(links))))
    .alpha(5)
    .restart();
  layout2D
    .force("link", createLinkForce(JSON.parse(JSON.stringify(links))))
    .alpha(5)
    .restart();

  streamRoomGraphCalls[roomId].forEach((call) => {
    call.write(graphs[roomId].data.graphViewData);
  });
  callback(null, { isRecieved: true } as EmptyMessage);
}
//#endregion

//#region other visualization
export function getTimelineDataStream(
  call: ServerWritableStream<RequestById, TimelineData>
) {
  const userKey = call.request.userKey;
  if (!userKey) return;

  const roomId = userKey.roomId;
  console.log("getTimelineDataStream", roomId, call.request);

  //   if (!roomId) return;

  // store the call for later use
  if (!streamTimelineDataCalls[roomId]) {
    streamTimelineDataCalls[roomId] = [];
  }
  streamTimelineDataCalls[roomId].push(call);

  // compute the timeline data from all links
  const graph = graphs[roomId].data;
  const graphViewData = graph.graphViewData;
  const nodes = graphViewData.nodes;
  const links = graphViewData.links;
  //   console.log("getTimelineDataStream", roomId, links.length);

  if (!timelineData[roomId]) {
    timelineData[roomId] = {
      data: {},
    };
    let roomTimelineData = timelineData[roomId];
    console.log("computing");

    computeTimelineData(roomTimelineData, links, nodes);

    console.log("computing done");
  }
  let roomTimelineData = timelineData[roomId];

  console.log("getTimelineDataStream next", roomTimelineData);

  streamTimelineDataCalls[roomId].forEach((call) => {
    call.write(roomTimelineData);
  });

  call.on("end", () => {
    // remove the call from the list
    streamTimelineDataCalls[roomId] = streamTimelineDataCalls[roomId].filter(
      (_call) => _call != call
    );

    console.log(
      "getTimelineDataStream end;",
      "remaining",
      streamTimelineDataCalls[roomId].length
    );
  });
}
//#endregion
