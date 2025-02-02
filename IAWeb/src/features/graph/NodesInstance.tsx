import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo } from "react";
import { useRef } from "react";
import * as THREE from "three";
import {
  getNodeColor,
  graphNodeUpdatePos,
  NodeColorMode,
  sendAction,
} from "../../common/graph";
import { useAppDispatch } from "../../hooks";
import store from "../../store";
import { setNodesNearbyCursor } from "../user/userSlice";
import { setNodesInstances } from "./graphSlice";
import * as d3 from "d3";
import { arrayEquals } from "../../common/helper";
import { GraphContextMenu } from "../../desktop/GraphContextMenu";
import {
  useGraphContextMenuStore,
  useGraphStore,
  useNodeCreateVisualizerStore,
} from "../../stores/store";
import { getUserColor } from "../../common/client";
import config from "../../config";
import { Node } from "../../common/message";
import { getNodeIndex } from "./LinksInstance";

const data = Array.from({ length: 1000 }, () => ({
  color: "#e84a5f",
  scale: 1,
}));
const tempColor = new THREE.Color();

export function computeMenuPosition(
  nodeId?: number,
  offset = [0, 0, 0]
): [number, number, number] {
  if (nodeId === undefined) {
    return [0, 0, 0];
  }
  return store.getState().graph.nodes[nodeId].map((v, i) => v + offset[i]) as [
    number,
    number,
    number
  ];
}

export function getNodeById(
  nodesRaw: Node[],
  nodeId: number,
  map: { [key: string]: number }
) {
  return nodesRaw[map[`${nodeId}`]];
}

export default function NodeInstances({
  temp = new THREE.Object3D(),
  temp2 = new THREE.Vector3(),
}: {
  temp?: THREE.Object3D;
  temp2?: THREE.Vector3;
}) {
  console.log("nodes instances");

  const ref = useRef<THREE.InstancedMesh>(null!);
  const otherHighlightedRef = useRef<THREE.InstancedMesh>(null!);

  const moving = useRef(false);
  const { camera } = useThree();
  const dispatch = useAppDispatch();
  const setIsNodeMenuOpen = useGraphContextMenuStore((state) => state.open);
  const setNodeMenu = useGraphContextMenuStore((state) => state.setContextMenu);
  const setIsMoveNode = useNodeCreateVisualizerStore(
    (state) => state.setNodeId
  );
  const pointerDownPosition = useRef<[number, number]>([0, 0]);
  const colorArray = useMemo(
    () =>
      Float32Array.from(
        new Array(1000)
          .fill(0)
          .flatMap((_, i) => tempColor.set(data[i].color).toArray())
      ),
    []
  );
  const colorArray2 = useMemo(
    () =>
      Float32Array.from(
        new Array(1000)
          .fill(0)
          .flatMap((_, i) => tempColor.set(data[i].color).toArray())
      ),
    []
  );

  useEffect(() => {
    dispatch(setNodesInstances(ref.current as any));
  }, []); // onmounted

  useFrame(({ mouse }) => {
    const nodes = store.getState().graph.nodes;
    const nodesRaw = store.getState().graph.nodesRaw;
    const nodeIdIndexMap = store.getState().graph.nodeIdIndexMap;

    // skip asyn update
    if (nodesRaw.length != nodes.length) {
      console.warn(nodesRaw.length, "!=", nodes.length, "skip asyn update");

      return;
    }

    if (config.isCollaborative) {
      // voronoi
      const points: [number, number][] = nodes.map((node) => {
        ref.current.localToWorld(temp2.set(node[0], node[1], node[2]));

        const normalizedProjected = temp2.project(camera);

        // console.log(node, normalizedProjected);

        return [normalizedProjected.x, normalizedProjected.y];
      });
      points.push([mouse.x, mouse.y]);
      // console.log(points.slice(0, 10));

      const voronoi = d3.Delaunay.from(points).voronoi([-1, -1, 1, 1]);
      const V = [...voronoi.neighbors(points.length - 1)];

      let polygon = voronoi.cellPolygon(points.length - 1);

      if (!polygon) {
        return;
      }

      const cursorPolygon = voronoi.cellPolygon(points.length - 1).slice(0, -1);

      const res = V.map((v) => {
        // calculate the Laplace weights for Natural neighbor interpolation

        // step 1 find the common edges
        const nPolygon = voronoi.cellPolygon(v).slice(0, -1);
        const commonEdges: [number, number][] = [];
        nPolygon.forEach((p) => {
          // console.log(p, cursorPolygon);

          if (cursorPolygon.find((p2) => arrayEquals(p, p2))) {
            commonEdges.push(p);
          }
        });
        // console.log(v, commonEdges);

        // step 2 calcuate the length of the common edges
        let length = -1;
        if (commonEdges.length === 2) {
          const [p1, p2] = commonEdges;
          const [x1, y1] = p1;
          const [x2, y2] = p2;
          length = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
        }

        // step 3 calculate the distance between the cursor and the node
        const [x, y] = points[v];
        const [mx, my] = points[points.length - 1];
        const distance = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);

        // step 4 calculate the weight
        if (length === -1 || nodesRaw[v] == undefined) {
          return {
            nodeId: nodesRaw[v]?.id,
            weight: 0,
          };
        }

        return {
          nodeId: nodesRaw[v].id,
          weight: length / distance,
        };
      });

      // step 5 calculate the weighted average
      const sum = res.reduce((acc, cur) => acc + cur.weight, 0);
      res.forEach((r) => (r.weight /= sum));

      // console.log(res, sum);

      dispatch(setNodesNearbyCursor(res));
      // console.log(points[points.length-1], V);
    }

    const clickedNodes = useGraphStore.getState().selectedNodeIds.map((id) => {
      return getNodeIndex(`${id}`, nodeIdIndexMap);
    });

    let instance = ref.current;
    if (instance) {
      instance.count = nodes.length;
      nodes.forEach((node, i) => {
        graphNodeUpdatePos(
          i,
          node,
          nodesRaw,
          instance,
          clickedNodes,
          temp,
          tempColor,
          colorArray
        );
      });
      instance.geometry.attributes.color.needsUpdate = true;
      instance.instanceMatrix.needsUpdate = true;
    }

    instance = otherHighlightedRef.current;
    if (instance) {
      const otherHighlightedNodes = store.getState().graph.allSelectedNodeIds;
      instance.count = otherHighlightedNodes.length;

      otherHighlightedNodes.forEach((nodeStatus, i) => {
        const targetNodeId = nodeIdIndexMap[`${nodeStatus.id}`];
        const node = nodes[targetNodeId];
        if (!node) {
          console.log("ERROR: otherHighlight node not found");

          return;
        }
        temp.position.set(node[0], node[1] + 8, node[2]);
        temp.updateMatrix();
        instance.setMatrixAt(i, temp.matrix);
        tempColor
          .set(getUserColor(nodeStatus.userId))
          .toArray(colorArray2, i * 3);
      });
      instance.geometry.attributes.color.needsUpdate = true;
      instance.instanceMatrix.needsUpdate = true;
    }
  });

  function menuNodeMove(id: number) {
    console.log("move", store.getState().graph.nodesRaw[id].id);

    // display visual cues
    setIsMoveNode(store.getState().graph.nodesRaw[id].id);

    setIsNodeMenuOpen(false);
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    // calculate the distance from the pointer down event
    if (moving.current) {
      const distance = Math.sqrt(
        (e.clientX - pointerDownPosition.current[0]) ** 2 +
          (e.clientY - pointerDownPosition.current[1]) ** 2
      );
      // console.log(distance);
      if (e.instanceId != undefined && distance > 2) {
        menuNodeMove(e.instanceId);
      }
    }
  };

  const onPointerUp = (e) => {
    moving.current = false;

    // right click
    if (e.nativeEvent.button == 2 && e.instanceId != undefined) {
      // console.log("pointer up right click");
      setNodeMenu(true, e.instanceId);
    }
  };

  return (
    // We set the initial count to 100000 to avoid creating a new InstancedMesh
    // If you need more instances than the original count value, you have to create a new InstancedMesh.
    // https://threejs.org/docs/#api/en/objects/InstancedMesh.count
    <>
      <instancedMesh
        // castShadow
        ref={ref}
        args={[undefined, undefined, 100000]}
        onPointerDown={(e) => {
          // console.log("pointer down");
          if (e.nativeEvent.button != 0) return; // only left click

          pointerDownPosition.current = [e.clientX, e.clientY];
          moving.current = true;
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={(e) => {
          moving.current = false;
          dispatch(setNodesNearbyCursor([]));
        }}
        onPointerEnter={(e) => {
          if (e.instanceId != undefined) {
            dispatch(
              setNodesNearbyCursor([
                {
                  nodeId: store.getState().graph.nodesRaw[e.instanceId].id,
                  weight: 1,
                },
              ])
            );
          }
        }}
        onPointerUp={onPointerUp}
        onClick={(e) => {
          let userId = store.getState().user.userInfo?.id;
          let user = store.getState().user.userInfo;
          if (
            userId == undefined ||
            e.instanceId == undefined ||
            user == undefined
          )
            return;
          sendAction(user, e.instanceId, "graph");
        }}
      >
        <sphereGeometry args={[5, 10, 10]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[colorArray, 3]}
          />
        </sphereGeometry>
        <meshBasicMaterial toneMapped={false} vertexColors={true} />
      </instancedMesh>

      <instancedMesh
        ref={otherHighlightedRef}
        args={[undefined, undefined, 100000]}
      >
        <boxGeometry args={[3, 3, 3]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[colorArray2, 3]}
          />
        </boxGeometry>
        <meshBasicMaterial toneMapped={false} vertexColors={true} />
      </instancedMesh>

      <GraphContextMenu temp={temp2} container={ref.current} />
    </>
  );
}
