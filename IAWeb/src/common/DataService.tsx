import { useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import { selectUser } from "../features/user/userSlice";
import { useAppSelector } from "../hooks";
import { pushStatus, useClient } from "./client";
import useRoomStream from "./useRoomStream";
import * as THREE from "three";
import { InitialRequest } from "./message_pb";

export default function DataService({
  tempVector = new THREE.Vector3(),
  tempQuaternion = new THREE.Quaternion(),
}: {
  tempVector?: THREE.Vector3;
  tempQuaternion?: THREE.Quaternion;
}) {
  console.log("data service");

  const selector = useAppSelector;
  const user = selector(selectUser);
  const { camera } = useThree();
  const interval = useRef<NodeJS.Timer>();

  useEffect(() => {
    interval.current = setInterval(() => {
      // push user info to server
      pushStatus(
        user,
        camera,
        undefined,
        undefined,
        tempVector,
        tempQuaternion
      );
    }, (1 / 10) * 1000); // 10 times per second

    console.log("data service effect camera changed", camera);
    return () => {
      clearInterval(interval.current);
    };

    
  }, [camera]);

  return <group></group>;
}
