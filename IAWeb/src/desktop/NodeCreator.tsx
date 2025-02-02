import { Line, Sphere } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useRef } from "react";
import {
  selectNodeIdIndexMap,
  selectNodesRaw,
  setToBeCreatedNodePosition,
} from "../features/graph/graphSlice";
import { useAppDispatch, useAppSelector } from "../hooks";
import store from "../store";
import * as THREE from "three";
import { useGraphStore, useNodeCreateVisualizerStore } from "../stores/store";
import { useDocumentStore } from "../stores/store";
import { getNodeIndex } from "../features/graph/LinksInstance";

const temp = new THREE.Vector3();
export function NodeCreator({ graph }: { graph: () => THREE.Group }) {
  console.log("rendering NodeCreator");

  const groupRef = useRef<THREE.Group>(null);
  const selector = useAppSelector;
  const dispatch = useAppDispatch();
  const idIndexMap = selector(selectNodeIdIndexMap);
  const selectedText = useDocumentStore((state) => state.selectedText);
  const selectedNodeIds = useGraphStore((state) => state.selectedNodeIds).map(
    (id) => {
      return getNodeIndex(`${id}`, idIndexMap);
    }
  );
  const isMoveNode = useNodeCreateVisualizerStore((state) => state.nodeId);

  useFrame(({ mouse, camera }) => {
    temp.set(mouse.x, mouse.y, 0);
    temp.unproject(camera);
    if (groupRef.current) {
      groupRef.current.position.set(temp.x, temp.y, 0);
    }
    if (graph()) {
      graph().worldToLocal(temp);
      dispatch(setToBeCreatedNodePosition({ x: temp.x, y: temp.y }));
    }
  });

  function drawPreview() {
    console.log(selectedNodeIds.length);

    if (selectedNodeIds.length == 2) {
      return (
        <Line
          points={
            selectedNodeIds.map((id) =>
              store.getState().graph.nodes[id].map((v) => v * 0.005)
            ) as [number, number, number][]
          }
          color="green"
          lineWidth={1}
        ></Line>
      );
    } else if (selectedNodeIds.length == 0 || isMoveNode) {
      return (
        <Sphere ref={groupRef} args={[1, 10, 10]} scale={[0.02, 0.02, 0.02]}>
          <meshBasicMaterial attach="material" color="green" />
        </Sphere>
      );
    }
  }

  return <group>{(selectedText || isMoveNode) && drawPreview()}</group>;
}
