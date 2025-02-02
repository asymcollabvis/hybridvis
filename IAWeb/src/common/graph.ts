import { GLink } from "../features/graph/graphSlice";
import store from "../store";
import { getUserColor, useClient } from "./client";
import {
  Node,
  UserInfo,
  Link,
  InitialRequest,
  ClientActions,
  ServerNodesStatus,
  NodeList,
  EmptyMessage,
  NodeSpatialInfo,
  Position,
  SpatialInfo,
  InitialRequest_ClientViewType,
} from "./message";
import * as d3 from "d3";
import { constructUserKeyFromUser } from "./helper";
import { useGraphStore } from "../stores/store";

export function viewType(dim?: string) {
  if (dim === "2d") {
    return InitialRequest_ClientViewType.VIEW_2D;
  } else {
    return InitialRequest_ClientViewType.VIEW_3D;
  }
}

export function addNode(
  user: UserInfo,
  data: string,
  documentId: string,
  x?: number,
  y?: number,
  z?: number,
  dataType = "text"
) {
  console.log("addNode from", documentId);
  const client = useClient();
  let newNode: Node = {
    roomId: user.roomId ?? "",
    name: data,
    data: data,
    createdBy: user.id,
    createdFrom: documentId,
    updatedBy: user.id,
    dataType: dataType ?? "text",
    userKey: constructUserKeyFromUser(user),
    id: "",
    highlightedBy: [],
    references: [],
  };
  if (x !== undefined || y !== undefined || z !== undefined) {
    let spatialInfo = {
      position: {
        x: x ?? 0,
        y: y ?? 0,
        z: z ?? 0,
      },
    };
    newNode.spatialInfo = spatialInfo;
  }
  client.addNode(newNode);
}

export function emptyLink(user: UserInfo, linkId: string) {
  const client = useClient();
  let existingLink = store
    .getState()
    .graph.links.find((link) => link.id === linkId);
  if (existingLink && existingLink.id) {
    const newLink: Link = {
      id: existingLink.id,
      data: "",
      updatedBy: user.id,
      userKey: constructUserKeyFromUser(user),
      source: 0,
      target: 0,
      name: "",
      roomId: "",
      createdFrom: "",
      createdBy: "",
    };
    client.addLink(newLink);
  }
}

export function updateTargetLink(
  user: UserInfo,
  targetLink: GLink,
  data: string
) {
  const client = useClient();
  let { target, source, documentId } = targetLink;
  let existingLink = store
    .getState()
    .graph.links.find(
      (link) =>
        (link.target === target && link.source === source) ||
        (link.target === source && link.source === target)
    );
  let newLink: Link = {
    id: existingLink?.id ?? "",
    roomId: user.roomId ?? "",
    target: target,
    source: source,
    data: data,
    createdBy: existingLink?.createdBy ?? user.id,
    createdFrom: documentId ?? "",
    updatedBy: user.id,
    userKey: constructUserKeyFromUser(user),
    name: "",
  };

  client.addLink(newLink);
}

export function addLink(
  user: UserInfo,
  target: number,
  source: number,
  data: string,
  documentId: string
) {
  console.log("addLink", target, source, data);

  const client = useClient();

  let existingLink = store
    .getState()
    .graph.links.find(
      (link) =>
        (link.target === target && link.source === source) ||
        (link.target === source && link.source === target)
    );

  const newLink: Link = {
    id: existingLink?.id ?? "",
    roomId: user.roomId ?? "",
    target: target,
    source: source,
    data: data,
    createdBy: user.id,
    createdFrom: documentId ?? "",
    updatedBy: user.id,
    userKey: constructUserKeyFromUser(user),
    name: "",
  };
  client.addLink(newLink).then((value) => {
    let res = value.response;
    // success
    console.log(res);
    clearNodeSelection(user);
  });
}

export function deleteNode(user: UserInfo, id: number) {
  const client = useClient();
  // const targetNode = new Node();
  // targetNode.setRoomid(user.roomId ?? "");
  // targetNode.setId(`${id}`);
  const targetNode = store
    .getState()
    .graph.nodesRaw.find((node) => +node.id === id);
  if (targetNode) {
    let toBeDeletedNode: Node = {
      ...targetNode,
      updatedBy: user.id,
      userKey: constructUserKeyFromUser(user),
    };
    client.removeNode(toBeDeletedNode);
  }
}

export function deleteLink(user: UserInfo, id: number) {
  const client = useClient();
  const targetLink: Link = {
    id: `${id}`,
    roomId: user.roomId ?? "",
    updatedBy: user.id,
    userKey: constructUserKeyFromUser(user),
    source: 0,
    target: 0,
    name: "",
    data: "",
    createdFrom: "",
    createdBy: "",
  };
  client.removeLink(targetLink).then((value) => {
    // let res = value.response;
    // console.log(res);
    clearNodeSelection(user);
  });
}

export function sendAction(user: UserInfo, id: number, fromView: string) {
  const clickedNodes = useGraphStore.getState().selectedNodeIds;
  const client = useClient();
  const targetNodeId = store.getState().graph.nodesRaw[id].id;
  console.log("sendAction", targetNodeId, id);

  let newClickedNodes = [...clickedNodes];
  if (clickedNodes.includes(+targetNodeId)) {
    console.log("remove", targetNodeId);

    newClickedNodes.splice(clickedNodes.indexOf(+targetNodeId), 1);
  } else {
    console.log("add", targetNodeId);
    newClickedNodes.push(+targetNodeId);
  }

  let action: ClientActions = {
    userKey: constructUserKeyFromUser(user),
    clickedNodes: newClickedNodes,
    hoveredNodes: [],
    fromView: "",
  };
  client.updateNodesStatus(action);
}

export function selectMultipleNodes(
  user: UserInfo,
  indices: number[],
  fromView: string
) {
  const clickedNodes = useGraphStore.getState().selectedNodeIds;
  const client = useClient();
  const targetNodeIds = indices.map(
    (id) => store.getState().graph.nodesRaw[id].id
  );
  console.log("selectMultipleNodes", targetNodeIds);

  let newClickedNodes: number[] = [];
  for (let i = 0; i < targetNodeIds.length; i++) {
    if (clickedNodes.includes(+targetNodeIds[i])) {
      console.log("remove", targetNodeIds[i]);
    } else {
      console.log("add", targetNodeIds[i]);
      newClickedNodes.push(+targetNodeIds[i]);
    }
  }

  let action = {
    userKey: constructUserKeyFromUser(user),
    clickedNodes: newClickedNodes,
    hoveredNodes: [],
    fromView,
  };
  client.updateNodesStatus(action);
}

export function clearNodeSelection(user: UserInfo) {
  const client = useClient();
  let action: ClientActions = {
    userKey: constructUserKeyFromUser(user),
    clickedNodes: [],
    hoveredNodes: [],
    fromView: "",
  };
  client.updateNodesStatus(action);
}

export function mergeNodes(user: UserInfo, selectedNodesIds?: number[]) {
  let roomId = user.roomId;
  if (!roomId) {
    console.error("no roomId");
    return;
  }

  const client = useClient();

  selectedNodesIds = selectedNodesIds ?? useGraphStore.getState().selectedNodeIds;

  let spatialInfos: NodeSpatialInfo[] = selectedNodesIds.map((id) => {
    return {
      id: `${id}`,
      roomId: `${roomId}`,
    };
  });

  let nodeList: NodeList = {
    spatialInfos,
    userKey: constructUserKeyFromUser(user),
  };

  client.mergeNodes(nodeList);
}

export function updateNode(user: UserInfo, data: string) {
  const client = useClient();
  const roomId = user.roomId;
  let targetNode = store
    .getState()
    .graph.nodesRaw.find(
      (n) => +n.id == useGraphStore.getState().selectedNodeIds[0]
    );

  if (targetNode) {
    updateTargetNode(user, targetNode, data);
    // targetNode.data = data;
    // targetNode.roomId = roomId;
    // targetNode.updatedBy = user.id;
    // targetNode.userKey = constructUserKeyFromUser(user);
    // // console.log("updateNode", targetNode.toObject());

    // client.updateNode(targetNode).then((value) => {
    //   // console.log(response);
    //   clearNodeSelection(user);
    // });
  }
}

export function updateTargetNode(
  user: UserInfo,
  targetNode: Node,
  data: string
) {
  const client = useClient();
  const roomId = user.roomId;

  if (targetNode) {
    const updatedNode = {
      ...targetNode,
      data,
      roomId,
      updatedBy: user.id,
      userKey: constructUserKeyFromUser(user),
    }; // clone
    // targetNode.data = data;
    // targetNode.roomId = roomId;
    // targetNode.updatedBy = user.id;
    // targetNode.userKey = constructUserKeyFromUser(user);
    // console.log("updateNode", targetNode.toObject());

    client.updateNode(updatedNode).then((value) => {
      // console.log(response);
      clearNodeSelection(user);
    });
  }
}

export function moveNode(
  user: UserInfo,
  id: string,
  position?: { x?: number; y?: number; z?: number }
) {
  position = position ?? store.getState().graph.toBeCreatedNodePosition;
  console.log("moveNode", id, position);

  if (!id) {
    return;
  }

  const client = useClient();
  const roomId = user.roomId;
  let targetNode = store.getState().graph.nodesRaw.find((n) => n.id == id);

  if (targetNode) {
    targetNode = { ...targetNode }; // clone

    console.log("moveNode", targetNode.id, position);
    let spatialInfo: SpatialInfo = {
      position: {
        x: position.x ?? 0,
        y: position.y ?? 0,
        z: position.z ?? 0,
      },
    };

    targetNode.spatialInfo = spatialInfo;

    targetNode.roomId = roomId;
    targetNode.updatedBy = user.id;
    targetNode.userKey = constructUserKeyFromUser(user);

    client.updateNode(targetNode).then((value) => {
      // console.log(response);
      clearNodeSelection(user);
    });
  }
}

export function graphNodeUpdatePos(
  i: number,
  node,
  nodesRaw: Node[],
  instance,
  clickedNodes: number[],
  temp,
  tempColor,
  colorArray
) {
  temp.position.set(node[0], node[1], node[2]);
  temp.quaternion.identity();

  if (nodesRaw[i] == undefined) {
    return;
  }

  if (nodesRaw[i].name === "document") {
    temp.scale.set(1.5, 1.5, 1.5);
  } else {
    temp.scale.set(1, 1, 1);
  }
  temp.updateMatrix();
  instance.setMatrixAt(i, temp.matrix);

  if (clickedNodes.includes(i)) {
    tempColor.set("red").toArray(colorArray, i * 3);
  } else {
    if (nodesRaw[i]) {
      tempColor
        .set(getNodeColor(nodesRaw[i], NodeColorMode.Datatype))
        .toArray(colorArray, i * 3);
      if (nodesRaw[i].name === "document") {
        tempColor.set("black").toArray(colorArray, i * 3);
      }
    }
  }
}

export enum NodeColorMode {
  CreatedBy = "createdBy",
  Datatype = "datatype",
  None = "none",
}

const colorScaleDatatype = d3
  .scaleOrdinal(["#ff7f0e", "#1f77b4", "black"])
  .domain(["date", "text", "document"]);

export function getNodeColor(node: Node, colorMode: NodeColorMode) {
  if (!node) {
    return "black";
  }

  if (colorMode === NodeColorMode.CreatedBy) {
    return getUserColor(node.createdBy);
  } else if (colorMode === NodeColorMode.Datatype) {
    return colorScaleDatatype(node.dataType);
  }
  return "black";
}
