import { getData } from "./data";
import * as d3force from "d3-force-3d";
import logger from "../logger.js";
import { EventType } from "../common.js";
import {
  GraphViewData,
  LinkList,
  NodeSpatialInfo,
  Link,
  SpatialInfo,
  ServerNodesStatus,
  Position,
  Rotation,
  Scale,
  UserKey,
  TimelineData,
  IdList,
  NodeList,
  Node,
  InitialGraphData,
} from "../message";

export function createLinkForce(links: any[]) {
  return d3force
    .forceLink(links)
    .id((d, i) => d.id)
    .strength((d) =>
      d.source.name == "document" || d.target.name == "document" ? 0.005 : 0.03
    )
    .distance(100);
}

export function boundingForce(boundingBox) {
  // console.log("boundingForce");
  let nodes, nDim;

  function force() {
    nodes.forEach((node) => {
      const { x, y, z } = node;
      if (x < boundingBox.x) {
        node.x = boundingBox.x;
        node.vx = 0;
      }
      if (x > boundingBox.x + boundingBox.width) {
        node.x = boundingBox.x + boundingBox.width;
        node.vx = 0;
      }
      if (y < boundingBox.y) {
        node.y = boundingBox.y;
        node.vy = 0;
      }
      if (y > boundingBox.y + boundingBox.height) {
        node.y = boundingBox.y + boundingBox.height;
        node.vy = 0;
      }
      if (nDim == 3 && z < boundingBox.z) {
        node.z = boundingBox.z;
        node.vz = 0;
      }
      if (nDim == 3 && z > boundingBox.z + boundingBox.depth) {
        node.z = boundingBox.z + boundingBox.depth;
        node.vz = 0;
      }
    });
  }

  force.initialize = function (_nodes, ...args) {
    // console.log("initialize bounding force");

    nodes = _nodes;
    nDim = args.find((arg) => [1, 2, 3].includes(arg)) || 2;
  };

  return force;
}

export function createGraph(
  data: { links: any[]; nodes: any[] },
  roomId: string,
  numOfDoc: number
) {
  if (data) {
    console.log("loading data from cache");
  } else {
    data = getData();

    let numDocPerCol = numOfDoc / 2;
    let clientScale = 0.004;

    const getAngle = function () {
      return (Math.PI / 10) * numDocPerCol;
    };

    // push document nodes
    new Array(numOfDoc).fill(0).forEach((_, i) => {
      let x =
        (Math.cos(
          ((i % numDocPerCol) / (numDocPerCol - 1)) * getAngle() -
            (getAngle() - Math.PI) / 2
        ) /
          clientScale) *
        1.8;
      let y = (Math.floor(i / numDocPerCol) * 1 + 0.05 - 2 + 0.5) / clientScale;
      let z =
        (-Math.sin(
          ((i % numDocPerCol) / (numDocPerCol - 1)) * getAngle() -
            (getAngle() - Math.PI) / 2
        ) /
          clientScale) *
        1.8;

      data.nodes.push({
        id: 10000 + i, // HACK: id > 10000 is document
        name: `document`,
        data: "document",
        type: "document",
        roomid: roomId,
        fx: x,
        fy: y,
        fz: z,
        x,
        y,
        z,
        dataType: "document",
      });
    });
    console.log("loading default data");
  }

  let nodes3d = JSON.parse(JSON.stringify(data.nodes));
  let layout = d3force
    .forceSimulation(nodes3d, 3)
    .force("charge", d3force.forceManyBody().strength(-15).distanceMax(200))
    .force(
      "collide",
      d3force
        .forceCollide()
        .radius((d) => (d.name === "document" ? 1.5 * 5 : 5) + 1)
    )
    .force("link", createLinkForce(JSON.parse(JSON.stringify(data.links))))
    .force("x", (d) => (d.type == "document" ? d3force.forceX(d.fx) : null))
    .force("y", (d) => (d.type == "document" ? d3force.forceY(d.fy) : null))
    .force("z", (d) => (d.type == "document" ? d3force.forceZ(d.fz) : null))
    .force(
      "bound",
      boundingForce({
        x: -500,
        y: -500,
        z: -500,
        width: 1000,
        height: 1000,
        depth: 1000,
      })
    );
  // .alphaTarget(0.1);
  // .force("center", d3force.forceCenter());

  let nodes2d = JSON.parse(JSON.stringify(data.nodes)).map((d) => {
    let x = d.x;
    let z = d.z;
    // project 3d to 2d arc
    let r = Math.sqrt(x * x + z * z);
    let theta = Math.atan2(z, x);
    d.x = r * theta + (Math.PI * r) / 2;
    if (d.fx) d.fx = r * theta + (Math.PI * r) / 2;
    // console.log(d.x);

    delete d["z"];
    delete d["vz"];
    delete d["fz"];
    return d;
  });

  // console.log("nodes2d", nodes2d);

  let layout2D = d3force
    .forceSimulation(nodes2d)
    .force("charge", d3force.forceManyBody().strength(-15).distanceMax(100))
    .force(
      "collide",
      d3force
        .forceCollide()
        .radius((d) => (d.name === "document" ? 1.5 * 5 : 5) + 1)
    )
    .force("link", createLinkForce(JSON.parse(JSON.stringify(data.links))))
    .force("x", (d) => (d.type == "document" ? d3force.forceX(d.fx) : null))
    .force("y", (d) => (d.type == "document" ? d3force.forceY(d.fy) : null))
    .force(
      "bound",
      boundingForce({
        x: -((1000 * Math.PI) / 2),
        y: -500,
        width: 1000 * Math.PI,
        height: 1000,
      })
    );
  // .alphaTarget(0.1);

  // .force("center", d3force.forceCenter());

  let graphViewData: GraphViewData = {
    nodes: [],
    links: [],
  };
  let nodes: NodeList = {
    spatialInfos: [],
  };
  let links: LinkList = {
    links: [],
  };

  // initialize graph view data
  // var x = layout.result[0],
  //   y = layout.result[1],
  //   z = layout.result[2];
  layout.nodes().forEach((node: any, i: number) => {
    // console.log("node", node);
    let newNode: Node = {
      id: `${node.id}`,
      name: node.name,
      data: node.data,
      createdFrom: node.createdFrom,
      createdBy: node.createdBy || "",
      roomId: roomId,
      dataType: node.dataType,
      highlightedBy: [],
      references: [],
      updatedBy: "",
    };
    graphViewData.nodes.push(newNode);

    let _node: NodeSpatialInfo = {
      id: `${node.id}`,
      roomId: roomId,
      spatialInfo: createSpatialInfo(
        [node.x, node.y, node.z ?? 0],
        [0, 0, 0, 0],
        [1, 1, 1]
      ),
    };
    nodes.spatialInfos.push(_node);
  });
  data.links.forEach((link) => {
    // links has been updated by d3-force-3d
    let link_: Link = {
      id: `${link.id}`,
      source: link.source.id,
      target: link.target.id,
      data: link.data,
      createdBy: link.createdBy || "",
      createdFrom: link.createdFrom || "",
      roomId: roomId,
      name: link.name || "",
      updatedBy: link.updatedBy || "",
    };
    links.links.push(link_);

    // console.log(link_);

    graphViewData.links.push(link_);
  });

  graphViewData.spatialInfo = createSpatialInfo(
    [0, 0, 0],
    [0, 0, 0, 0],
    [1, 1, 1]
  );

  return { graphViewData, nodes, links, layout, layout2D };
}

export function updateGraph(
  layout: any,
  graphViewData: GraphViewData,
  newPose: SpatialInfo
) {
  layout.tick();
  // console.log("updateGraph", graphViewData.nodes.length, layout.nodes());

  // initialize graph view data
  let oldNodeList = graphViewData.nodes;
  let newNodeList: Node[] = [];
  layout.nodes().forEach((node: any, i: number) => {
    let _node = oldNodeList[i];
    _node.spatialInfo = createSpatialInfo(
      [node.x, node.y, node.z ?? 0],
      [0, 0, 0, 0],
      [1, 1, 1]
    );
    newNodeList.push(_node);
  });

  graphViewData.nodes = newNodeList;
  graphViewData.spatialInfo = newPose;
}

export function getNodesSpatialInfo(layout: any, nodesList: NodeList) {
  nodesList.spatialInfos = layout
    .nodes()
    .map((node: any, i: number): NodeSpatialInfo => {
      let _nodeSpatialInfo: NodeSpatialInfo = nodesList.spatialInfos[i];
      _nodeSpatialInfo.spatialInfo = createSpatialInfo(
        [node.x, node.y, node.z ?? 0],
        [0, 0, 0, 0],
        [1, 1, 1]
      );
      return _nodeSpatialInfo;
    });

  return nodesList;
}

export function createStatus(): ServerNodesStatus {
  return {
    hightlighted: {},
  };
}

export function createSpatialInfo(
  pos: [number, number, number],
  rot: [number, number, number, number],
  scale: [number, number, number]
): SpatialInfo {
  return {
    position: {
      x: pos[0],
      y: pos[1],
      z: pos[2],
    },
    rotation: {
      x: rot[0],
      y: rot[1],
      z: rot[2],
      w: rot[3],
    },
    scale: {
      x: scale[0],
      y: scale[1],
      z: scale[2],
    },
  };
}

/**
 * Add a link to the target graph and assign the id to the link
 * @param graphs
 * @param roomId
 * @param graphViewData
 * @param link
 * @param timelineData
 * @param streamTimelineDataCalls
 */
export function addLinkToGraph(
  userKey: UserKey,
  roomId: string,
  graphViewData: GraphViewData,
  link: Link,
  timelineData: {
    [roomId: string]: TimelineData;
  },
  streamTimelineDataCalls
) {
  let lastItem = graphViewData.links.at(-1);
  let nextId = lastItem ? +lastItem.id + 1 : 0;
  link.id = `${nextId}`;
  console.log("adding link", link.target, link.source, link);
  // console.log( layouts[roomId]["3D"].nodes());
  logger.info({
    event: EventType.AddLink,
    data: {
      ...link,
      userid: link.updatedBy,
      roomid: userKey.roomId,
      type: userKey.type,
    },
  });

  graphViewData.links.push(link);

  // update timeline data
  if (!timelineData[roomId])
    timelineData[roomId] = {
      data: {},
    };
  let roomTimelineData = timelineData[roomId];
  // add data to timeline if one of the node's datatype is date
  let timeNode: Node;
  let valueNode: Node;

  let nodes = graphViewData.nodes;
  let sourceNode = nodes.find((n) => +n.id == link.source);
  let targetNode = nodes.find((n) => +n.id == link.target);

  if (sourceNode.dataType == "date") {
    timeNode = sourceNode;
    valueNode = targetNode;
  } else if (targetNode.dataType == "date") {
    timeNode = targetNode;
    valueNode = sourceNode;
  }

  if (timeNode) {
    // console.log("add timeline data", timeNode);
    const dataMap = roomTimelineData.data;
    const prevData = dataMap[timeNode.data] ?? ({ ids: [] } as IdList);
    prevData.ids = [...prevData.ids, valueNode.id];
    dataMap[timeNode.data] = prevData;

    if (streamTimelineDataCalls[roomId]) {
      streamTimelineDataCalls[roomId].forEach((call) => {
        call.write(roomTimelineData);
      });
    }
  }
}

export function precomputeUpdatedLinks(
  roomId: string,
  nodes: Node[],
  links: Link[],
  filterFn: (link: Link) => boolean,
  timelineData: { [roomId: string]: TimelineData },
  streamTimelineDataCalls: { [roomId: string]: any[] }
) {
  let res: Link[] = [];
  let linksToBeDeleted: Link[] = [];
  links.forEach((link) => {
    let toBeRemained = filterFn(link);
    if (toBeRemained) {
      res.push(link);
    } else {
      linksToBeDeleted.push(link);
    }
  });

  // no links to be deleted
  if (linksToBeDeleted.length == 0) return res;

  // update timeline data
  if (!timelineData[roomId]) {
    console.log("no timeline data for room", roomId);

    return res;
  }

  let roomTimelineData: TimelineData = timelineData[roomId];
  let dataMap = roomTimelineData.data;

  // remove data from timeline if one of the node's datatype is date
  linksToBeDeleted.forEach((link) => {
    let sourceNode = nodes.find((n) => +n.id == link.source);
    let targetNode = nodes.find((n) => +n.id == link.target);

    // NOTE: we may have two timeline nodes linked together, so we need to check both nodes
    if (sourceNode.dataType == "date") {
      let prevData = dataMap[sourceNode.data];
      if (prevData) {
        prevData.ids = prevData.ids.filter((id) => id != targetNode.id);
        dataMap[sourceNode.data] = prevData;
      }
    }
    if (targetNode.dataType == "date") {
      let prevData = dataMap[targetNode.data];
      if (prevData) {
        prevData.ids = prevData.ids.filter((id) => id != sourceNode.id);
        dataMap[targetNode.data] = prevData;
      }
    }
  });

  if (streamTimelineDataCalls[roomId]) {
    streamTimelineDataCalls[roomId].forEach((call) => {
      call.write(roomTimelineData);
    });
  }

  return res;
}
