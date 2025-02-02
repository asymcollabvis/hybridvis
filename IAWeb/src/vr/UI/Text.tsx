import { Plane, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { forwardRef, useEffect, useRef } from "react";
import * as THREE from "three";

type VRText = {
  children: string;
  position?: [number, number, number];
  backgroundColor?: string;
  maxWidth?: number;
  scale?: number;
};

const temp = new THREE.Vector3();
export default forwardRef<THREE.Group, VRText>(
  (
    {
      children,
      backgroundColor = "white",
      position = [0, 0, 0],
      maxWidth = 0.7,
      scale = 50,
    },
    ref
  ) => {
    const textRef = useRef<THREE.Mesh>(null!);
    const bgPlaneRef = useRef<THREE.Mesh>(null!);
    useFrame(() => {
      const bbox = textRef.current.geometry.boundingBox;
      bbox?.getSize(temp);
      bgPlaneRef.current.scale.set(temp.x, temp.y, 1);
    });

    return (
      <group position={position} scale={scale} ref={ref}>
        <Plane ref={bgPlaneRef} position={[0, 0, -0.01]}>
          <meshBasicMaterial
            // attach="material"
            color={backgroundColor}
            side={THREE.DoubleSide}
          />
        </Plane>
        <Text
          font="/NotoSansSC-Regular.woff"
          overflowWrap="break-word" // added for chinese characters
          ref={textRef}
          color="black"
          anchorX={"center"}
          anchorY={"middle"}
          maxWidth={maxWidth}
        >
          {children}
        </Text>
      </group>
    );
  }
);
