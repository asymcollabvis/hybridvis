import { Sky } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import { InitialRequest, InitialRequest_ClientViewType } from "../common/message";
import useRoomStream from "../common/useRoomStream";
import VisualGuide from "../common/VisualGuide";
import Graph from "../features/graph/Graph";
import { selectUser } from "../features/user/userSlice";
import { useAppSelector } from "../hooks";
import { NodeCreator } from "./NodeCreator";
import * as THREE from "three";
import DataService from "../common/DataService";

export function Scene({ dim }: { dim: InitialRequest_ClientViewType }) {
  console.log("rendering scene");
  useRoomStream(dim);

  // const { camera } = useThree();
  const graphRef = useRef<THREE.Group>(null!);
  const arrowRef = useRef<THREE.Group>(null!);

  // useFrame(() => {
    // update arrow position
    // arrowRef.current.position.x = camera.position.x;
    // arrowRef.current.position.y = camera.position.y;
  // });

  return (
    <>
      {/* <Sky /> */}
      <color attach={"background"} args={["#E4E8E9"]} />
      <Graph ref={graphRef} dim={dim} scale={[0.005, 0.005, 0.005]} />
      <ambientLight intensity={0.5} />
      <NodeCreator graph={() => graphRef.current} />
      {/* <VisualGuide ref={arrowRef} graph={() => graphRef.current} /> */}
      <DataService />
    </>
  );
}
