import React, { useEffect } from "react";
import { Box, Mask, Plane, Sky, useMask } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import * as THREE from "three";

export default function BackgroundContext({
  mode = "vr",
}: {
  mode?: "vr" | "ar";
}) {
  const stencil = useMask(1, true);
  const roomSize = 6;
  return (
    <>
      {/* <TeleportArea> */}
      <Box
        name="room"
        scale={[roomSize, roomSize, roomSize]}
        position={[0, roomSize / 2, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="white"
          side={THREE.BackSide}
          {...stencil}
        />
      </Box>
      {/* <Plane
        position={[0, 0, 0]}
        scale={[4, 4, 1]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="grey" {...stencil} />
      </Plane> */}
      {/* </TeleportArea> */}
      {/* {mode === "vr" && <Sky />} */}
      {/* {mode === "ar"} */}
      <ambientLight intensity={0.4} />
      <directionalLight
        // shadow-mapSize-width={1024}
        position={[-2.5, 8, -5]}
        intensity={0.2}
        // shadow-mapSize-height={512}
        // castShadow
      />
    </>
  );
}
