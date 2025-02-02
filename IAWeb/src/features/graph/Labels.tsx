import React, { forwardRef, useCallback, useEffect } from "react";
import { useAppSelector } from "../../hooks";
import { selectNodes, selectNodesRaw } from "./graphSlice";
import { Box, Html, Sphere, Text } from "@react-three/drei";
import { selectUserEnv } from "../user/userSlice";
import { UserInfo, Node, UserInfo_ClientType } from "../../common/message";
import { useFrame, useThree } from "@react-three/fiber";
import { Interactive } from "@react-three/xr";
import * as THREE from "three";
import store from "../../store";
import useSystemKeyboard from "../../vr/useSystemKeyboard";
import { updateTargetNode } from "../../common/graph";
import LabelEditButton from "./LabelEditButton";
import { shallowEqual } from "react-redux";
import { useGraphStore } from "../../stores/store";

export default function Labels({ temp = new THREE.Vector3() }) {
  // TODO: fix this: performance issue
  console.log("labels");

  const selector = useAppSelector;
  // const nodes = selector(selectNodes);
  // const nodesRaw = selector(selectNodesRaw);
  const nodesRaw = useGraphStore((state) => state.nodes);
  const env = selector(selectUserEnv);
  const textRefs = React.useRef<THREE.Group[]>([]);

  const { camera, gl } = useThree();
  const _camera = gl.xr.isPresenting ? gl.xr.getCamera() : camera;

  useFrame(() => {
    // let temp = new THREE.Vector3();

    _camera.getWorldPosition(temp);
    // console.log(temp);
    // console.log(textRefs);

    const nodes = store.getState().graph.nodes;

    textRefs.current.forEach((ref, i) => {
      if (ref && nodes[i]) {
        ref.position.set(
          nodes[i][0] +
            (env === UserInfo_ClientType.DESKTOP ? getOffset(i) : 0),
          nodes[i][1],
          nodes[i][2]
        );

        if (env === UserInfo_ClientType.VR) {
          ref.lookAt(temp);
        }
      }
    });

    // console.log(textRefs.current[0]);
  });

  const getName = (index: number) => {
    if (nodesRaw[index]) {
      const data = nodesRaw[index].data;
      if (data === "document") {
        const id = nodesRaw[index].id;
        return +id - 10000;
      } else {
        return data;
      }
    }
    return "";
  };

  const getOffset = (index: number) => {
    if (nodesRaw[index]) {
      const data = nodesRaw[index].data;
      let size = 5;
      if (data === "document") {
        return size * 1.5 + 1;
      } else {
        return size + 0.05;
      }
    }
    return 0;
  };

  const getSize = (index: number) => {
    if (nodesRaw[index]) {
      const data = nodesRaw[index].data;
      let size = 5;
      if (data === "document") {
        return size * 1.5;
      } else {
        return size;
      }
    }
    return 0;
  };

  return (
    <group>
      {nodesRaw.map((node, i) => {
        return (
          <group key={i} ref={(el) => (textRefs.current[i] = el!)}>
            {/* <Html
              wrapperClass={"nodelinkLabel"}
              // position={[node[0] + getOffset(i), node[1], node[2]]}
              distanceFactor={0.002}
              style={{
                transform: "translateY(-50%)",
                width: "100px",
              }}
            >
              {getName(i)}
            </Html> */}
            <Text
              font="/NotoSansSC-Regular.woff"
              overflowWrap="break-word" // added for chinese characters
              color="black"
              position={[getOffset(i), 0, 50]}
              scale={10}
              anchorX={"left"}
              anchorY={"middle"}
              maxWidth={12}
            >
              {getName(i)}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
