import { Line, Sphere } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useController, useXREvent } from "@react-three/xr";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { forwardRef } from "react";
import { shallowEqual } from "react-redux";
import * as THREE from "three";
import { moveNode } from "../common/graph";
import useDragToAddNode from "../common/useDragToAddNode";
import {
  selectNodeIdIndexMap,
  selectNodesRaw,
  setToBeCreatedNodePosition,
} from "../features/graph/graphSlice";
import { useAppDispatch, useAppSelector } from "../hooks";
import store from "../store";
import {
  useDocumentStore,
  useGraphStore,
  useNodeCreateVisualizerStore,
} from "../stores/store";
import { intersects } from "./interactions/utils";
import { getNodeIndex } from "../features/graph/LinksInstance";

export default function NodeCreator({
  temp = new THREE.Vector3(),
  temp2 = new THREE.Vector3(),
}: {
  temp?: THREE.Vector3;
  temp2?: THREE.Vector3;
}) {
  console.log("rendering NodeCreator");
  const groupRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.Object3D>(null);

  const [canBeAdded, setCanBeAdded] = useState(false);
  const dispatch = useAppDispatch();
  const selector = useAppSelector;
  const selectedText = useDocumentStore((state) => state.selectedText);
  const idIndexMap = selector(selectNodeIdIndexMap);
  const setIsMoveNode = useNodeCreateVisualizerStore(
    (state) => state.setNodeId
  );
  const selectedNodeIds = useGraphStore((state) => state.selectedNodeIds).map(
    (id) => {
      return getNodeIndex(`${id}`, idIndexMap);
    }
  );
  const { dragToAddNode } = useDragToAddNode();

  const rightController = useController("right");
  const hand0 = useThree((state) => state.gl.xr.getHand(0));
  const hand1 = useThree((state) => state.gl.xr.getHand(1));

  const isMoveNode = useNodeCreateVisualizerStore((state) => state.nodeId);

  useFrame(() => {
    let graph = store.getState().graph.graph;
    if (!graph) return;
    graph.updateMatrixWorld();

    const rightHand = [hand0, hand1].find((hand) => hand.handedness == "right");
    const rightHandController = rightHand
      ? rightHand.grabArea
        ? { controller: rightHand.grabArea, grip: rightHand.grabArea }
        : undefined
      : undefined;

    const input = rightController || rightHandController;
    // const input = rightController;

    if (input && input.controller) {
      // locate seleted node
      input.controller.getWorldDirection(temp);
      input.controller.getWorldPosition(temp2);
      temp2.add(temp.multiplyScalar(-0.03));

      if (groupRef.current) {
        groupRef.current.position.copy(temp2);
        // console.log(temp2);

        temp.copy(temp2);
        // console.log(graph.matrixWorld, graph.matrixWorld.elements);

        graph.worldToLocal(temp);
        // console.log(temp, graph);

        dispatch(
          setToBeCreatedNodePosition({ x: temp.x, y: temp.y, z: temp.z })
        );
      }

      // check if the rightController inside graph
      const bbox = new THREE.Box3();
      bbox.setFromObject(input.grip);

      if (bbox && intersects(bbox, graph)) {
        // console.log("inside graph");

        if (!canBeAdded) setCanBeAdded(true);
      } else {
        // console.log("outside graph");
        if (canBeAdded) setCanBeAdded(false);
      }
    }

    if (lineRef.current) {
      lineRef.current.geometry.setPositions(
        selectedNodeIds.flatMap((id) => {
          let [x, y, z] = store.getState().graph.nodes[id].map((v) => v);
          temp.set(x, y, z);
          graph.localToWorld(temp);

          return temp.toArray();
        })
      );
    }
  });

  const onSqueeze = useCallback(
    (e) => {
      if (e.nativeEvent.data?.handedness === "right") {
        console.log("onSqueeze", canBeAdded, selectedText, isMoveNode);

        if (canBeAdded) {
          if (selectedText) {
            console.log("addNode");

            dragToAddNode();
          }

          if (isMoveNode) {
            console.log("moveNode");

            // move node
            let user = store.getState().user.userInfo;
            if (user) {
              moveNode(user, isMoveNode);
            }

            setIsMoveNode(undefined);
          }
        }
      }
    },
    [canBeAdded, selectedText, isMoveNode]
  );
  useXREvent("squeeze", onSqueeze);

  const onSqueezeHand = useCallback(
    (e) => {
      console.log("onSqueezeHand", e);

      e.nativeEvent = { data: { handedness: e.target.handedness } };
      onSqueeze(e);
    },
    [onSqueeze]
  );

  useEffect(() => {
    [hand0, hand1].forEach((hand) => {
      // hand.addEventListener("handgrab", onSqueezeHand);
      // hand.addEventListener("pinchend", onSqueezeHand);
      hand.addEventListener("handrelease", onSqueezeHand);
      return () => {
        // hand.removeEventListener("handgrab", onSqueezeHand);
        // hand.removeEventListener("pinchend", onSqueezeHand);
        hand.addEventListener("handrelease", onSqueezeHand);
      };
    });
  }, [hand0, hand1, onSqueezeHand]);

  function drawPreview() {
    let graph = store.getState().graph.graph;
    if (!graph) return;

    if (selectedNodeIds.length == 2) {
      if (canBeAdded) {
        return (
          <Line
            ref={lineRef}
            points={selectedNodeIds.map((id) =>
              store
                .getState()
                .graph.nodes[id].map(
                  (v, i) => v * 0.005 + graph.position.toArray()[i]
                )
            )}
            color="green"
            lineWidth={1}
          ></Line>
        );
      }
    } else if (selectedNodeIds.length == 0 || isMoveNode) {
      return (
        <Sphere ref={groupRef} args={[1, 10, 10]} scale={[0.02, 0.02, 0.02]}>
          <meshBasicMaterial
            attach="material"
            color={"green"}
            transparent
            opacity={canBeAdded ? 1 : 0.3}
          />
        </Sphere>
      );
    }
  }

  return <group>{(selectedText || isMoveNode) && drawPreview()}</group>;
}
