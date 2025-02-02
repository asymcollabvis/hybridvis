import React, { useEffect } from "react";
import { useAppSelector } from "../../hooks";
import {
  GLink,
  GNode,
  selectLinks,
  selectNodes,
  selectNodesRaw,
} from "./graphSlice";
import { Html } from "@react-three/drei";
import Text from "../../vr/UI/Text";
import { selectUserEnv } from "../user/userSlice";
import { UserInfo, UserInfo_ClientType } from "../../common/message";
import { getNodeIndex } from "./LinksInstance";
import store from "../../store";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import LabelEditButton from "./LabelEditButton";
import { useGraphStore } from "../../stores/store";

function computeLinkCenter(link: GLink, nodes: GNode[]) {
  const nodeIdIndexMap = store.getState().graph.nodeIdIndexMap;
  const source = getNodeIndex(`${link.source}`, nodeIdIndexMap);
  const target = getNodeIndex(`${link.target}`, nodeIdIndexMap);
  const node1 = nodes[source];
  const node2 = nodes[target];
  if (!node1 || !node2) {
    return [0, 0, 0];
  }
  return [
    (node1[0] + node2[0]) / 2,
    (node1[1] + node2[1]) / 2,
    (node1[2] + node2[2]) / 2,
  ];
}

export default function LinkLabels({ temp = new THREE.Vector3() }) {
  // TODO: fix this: performance issue
  console.log("link labels");

  const selector = useAppSelector;
  // const nodes = selector(selectNodes);
  // const links = selector(selectLinks);
  const links = useGraphStore((store) => store.links);
  const env = selector(selectUserEnv);
  // const nodesRaw = selector(selectNodesRaw);
  const nodesRaw = useGraphStore((store) => store.nodes);

  function computeText(link: GLink) {
    return link.data.length > 100 ? link.data.slice(0, 100) + "..." : link.data;
  }

  const { camera, gl } = useThree();
  const _camera = gl.xr.isPresenting ? gl.xr.getCamera() : camera;
  const textRefs = React.useRef<THREE.Group[]>([]);

  useFrame(() => {
    // let temp = new THREE.Vector3();

    _camera.getWorldPosition(temp);
    // console.log(temp);
    // console.log(textRefs);

    const nodes = store.getState().graph.nodes;

    textRefs.current.forEach((ref, i) => {
      if (ref && links[i]) {
        const [x, y, z] = computeLinkCenter(links[i], nodes);
        // console.log(x, y, z);

        ref.position.set(x, y, z);

        if (env === UserInfo_ClientType.VR) ref.lookAt(temp);
      }
    });
    // console.log(textRefs.current[0]);
  });

  return (
    <group>
      {nodesRaw &&
        links.map((link, i) => {
          return (
            <group ref={(el) => (textRefs.current[i] = el)} key={i}>
              <Text
                font="/NotoSansSC-Regular.woff"
                overflowWrap="break-word" // added for chinese characters
                position={[0, 0, 51]}
                key={i}
                maxWidth={12}
                backgroundColor={"white"}
                scale={10}
              >
                {computeText(link)}
              </Text>
            </group>
          );
        })}
    </group>
  );
}
