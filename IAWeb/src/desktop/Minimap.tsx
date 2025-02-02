import React, { useRef } from "react";
import { Box, OrbitControls, OrthographicCamera, PerspectiveCamera, View, Sky } from "@react-three/drei";
import Graph from "../features/graph/StaticGraph";
import UserInstances from "../features/room/UsersInstance";
import { InitialRequest, InitialRequest_ClientViewType } from "../common/message";

export default function MiniMap() {
  console.log("rendering minimap");
  
  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 4]} zoom={50} />

      <ambientLight intensity={1} />
      <Graph
        dim={InitialRequest_ClientViewType.VIEW_2D}
        scale={[0.005, 0.005, 0.005]}
        showLabels={false}
      />

      <UserInstances
        showCameraPos={false}
        showSelf={true}
      ></UserInstances>
    </>
  );
};