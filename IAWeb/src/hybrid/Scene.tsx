import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef } from "react";
import { viewType } from "../common/graph";
import Scene from "../vr/Scene";
import SimulatedPC from "./SimulatedPC";
import * as THREE from "three";
import BackgroundContext from "../vr/BackgroundContext";
import { pushStatus, useClient } from "../common/client";
import { RequestById, TrackerInfo } from "../common/message";
import store from "../store";
import { Interactive, useController, useXR } from "@react-three/xr";
import { useAppSelector } from "../hooks";
import { selectUser } from "../features/user/userSlice";
import { Box, Sphere, useHelper } from "@react-three/drei";
import { AxesHelper, Vector3 } from "three";
import { ClientDuplexStream } from "@grpc/grpc-js";
import { constructUserKeyFromUser } from "../common/helper";
import { useControllerGamepad } from "../vr/interactions/useControllerGamepad";

export default function HybridScene() {
  const { camera, gl } = useThree();
  const _camera = gl.xr.isPresenting ? gl.xr.getCamera() : camera;
  let dim = "3d";
  const vrSceneRef = useRef<THREE.Group>(null!);
  const simPCSceneRef = useRef<THREE.Group>(null!);
  const currModeRef = useRef<"vr" | "simPC">("simPC");
  const threshold = 1.3;
  const client = useClient();
  const { player } = useXR();

  // useEffect(() => {
  //   vrSceneRef.current.traverse(function (child) {
  //     console.log(child.visible);
  //     child.userData = { prevVisible: child.visible };
  //     child.visible = false;
  //   });
  //   simPCSceneRef.current.traverse(function (child) {
  //     child.userData = { prevVisible: child.visible };
  //   });
  // }, []);

  const showVR = () => {
    vrSceneRef.current.traverse(function (child) {
      child.visible =
        child.userData.prevVisible === undefined
          ? child.visible
          : child.userData.prevVisible;
    });
    simPCSceneRef.current.traverse(function (child) {
      child.userData = { prevVisible: child.visible };
      child.visible = false;
    });
  };

  const showSimPC = () => {
    simPCSceneRef.current.traverse(function (child) {
      child.visible =
        child.userData.prevVisible === undefined
          ? child.visible
          : child.userData.prevVisible;
    });
    vrSceneRef.current.traverse(function (child) {
      child.userData = { prevVisible: child.visible };
      child.visible = false;
    });
  };

  const updateDocumentStateToPC = () => {
    // const user = store.getState().user.userInfo;
    // const roomId = user?.getRoomid();
    // if (!user || !roomId) {
    //   return;
    // }
    // client.updateDocumentState(
    //   new RequestById()
    //     .setUserid("pc")
    //     .setId(`${store.getState().document.documentId}`)
    //     .setRoomid(roomId),
    //   {},
    //   () => {
    //     console.log("updated document state successfully");
    //   }
    // );
  };

  // useFrame(() => {
  //   movePCPose();
  // });

  const moveSimPCPose = () => {
    simPCSceneRef.current.position.set(
      _camera.position.x,
      0,
      _camera.position.z
    );
    // copy rotation from camera
    simPCSceneRef.current.quaternion.copy(_camera.quaternion);

    // reset quaternion on x and z axis
    simPCSceneRef.current.quaternion.x = 0;
    simPCSceneRef.current.quaternion.z = 0;
  };

  const updateVRCameraPose = () => {
    const users = store.getState().room.userList;
    const _camera = gl.xr.isPresenting ? gl.xr.getCamera() : camera;

    const pc = users.find((u) => u.id === "pc");

    if (!pc) {
      return;
    }

    const pcSpatialInfo = store.getState().room.userSpatialInfo["pc"];

    if (!pcSpatialInfo) {
      return;
    }

    // update camera pose based on the position of PC side
    console.log("override in VR", pcSpatialInfo);
    console.log(player.position);

    player.position.set(
      pcSpatialInfo?.position?.x || 0,
      player.position.y,
      player.position.z
    );
  };

  const updatePCCameraPose = () => {
    // const users = store.getState().room.userList;
    // const pc = users.find((u) => u.id === "pc");
    // if (!pc) {
    //   return;
    // }
    // // TODO: project VR camera position on to the curved surface of documents
    // pc.setOverride(true);
    // pushStatus(pc, _camera);
  };

  const transitionTo = (mode: "vr" | "simPC") => {
    if (mode === "vr") {
      showVR();

      updateVRCameraPose();

      currModeRef.current = "vr";
    } else {
      updateDocumentStateToPC();

      moveSimPCPose();

      updatePCCameraPose();

      showSimPC();

      currModeRef.current = "simPC";
    }
  };

  // useTrackerInfo();

  // useFrame(() => {
  //   // console.log(_camera.position.y);

  //   if (_camera.position.y < threshold && currModeRef.current !== "simPC") {
  //     // desktop mode
  //     transitionTo("simPC");
  //   } else if (
  //     _camera.position.y >= threshold &&
  //     currModeRef.current !== "vr"
  //   ) {
  //     // vr mode
  //     transitionTo("vr");
  //   }
  // });

  return (
    <>
      <Scene dim={viewType(dim)} ref={vrSceneRef} />

      {/* <SimulatedPC ref={simPCSceneRef} /> */}

      <BackgroundContext mode={"ar"} />

      <Tracker />
    </>
  );
}

const Tracker = ({
  temp1 = new THREE.Vector3(),
  temp2 = new THREE.Quaternion(),
}) => {
  const selector = useAppSelector;
  const client = useClient();
  const user = selector(selectUser);

  // const trackerInfoStream = useRef<ClientDuplexStream<
  //   RequestById,
  //   TrackerInfo
  // > | null>(null);

  const ref = useRef<THREE.Group>(null!);
  // const refPos = useRef<THREE.Group>(null!);

  const initialized = useRef(false);
  const offsetPos = useRef(new THREE.Vector3(0, 0, 0));
  // const offsetRot = useRef(new THREE.Quaternion(0, 0, 0, 1));
  const originPos = useRef(new THREE.Vector3(0, 0, 0));
  const groupRef = useRef<THREE.Group>(null!);

  // useHelper(ref.current, AxesHelper, 3);

  function trackerCallback(trackerInfo: TrackerInfo) {
    // console.log(trackerInfo);
    if (!initialized.current) {
      offsetPos.current.set(
        trackerInfo.position?.x || 0 - originPos.current.x,
        trackerInfo.position?.y || 0 - originPos.current.y,
        trackerInfo.position?.z || 0 - originPos.current.z
      );
      initialized.current = true;
    }

    if (!ref.current) {
      return;
    }

    ref.current.position.set(
      trackerInfo.position?.x || 0 - offsetPos.current.x,
      trackerInfo.position?.y || 0 - offsetPos.current.y,
      trackerInfo.position?.z || 0 - offsetPos.current.z
    );

    temp2.set(
      trackerInfo.rotation?.x || 0,
      trackerInfo.rotation?.y || 0,
      trackerInfo.rotation?.z || 0,
      trackerInfo.rotation?.w || 1
    );

    let euler = new THREE.Euler();
    euler.setFromQuaternion(temp2, "XYZ");

    ref.current.rotation.set(euler.z, euler.y, euler.x);
  }

  function startTrackerStreaming() {
    if (!user) {
      return;
    }

    console.log("start tracker stremaing");

    let stream = client.getTrackerInfoStream({
      id: user.roomId,
      userKey: constructUserKeyFromUser(user),
    });
    new Promise<void>(async (resolve, reject) => {
      try {
        for await (const response of stream.responses) {
          trackerCallback(response);
        }
      } catch (error) {
        reject(new Error("Whoops! getTrackerInfoStream"));
      }

      resolve();
    })
      .then(() => {
        console.log("Stream ended");
        startTrackerStreaming();
      })
      .catch((err) => {
        console.log("Stream error: " + err);
        startTrackerStreaming();
      });
  }

  useEffect(() => {
    startTrackerStreaming();
  }, [user?.roomId]);

  const resetOrigin = () => {
    console.log("reset origin");
    const temp = new THREE.Vector3();
    // get controller position

    if (!controller) {
      return;
    }

    temp.setFromMatrixPosition(controller.controller.matrixWorld);
    let parentPosition = new THREE.Vector3();
    groupRef.current.parent?.getWorldPosition(parentPosition);
    groupRef.current.position.set(
      temp.x - parentPosition.x,
      temp.y - parentPosition.y,
      temp.z - parentPosition.z
    );
  };

  const { xClicked, yClicked } = useControllerGamepad("right");
  const controller = useController("right");

  useEffect(() => {
    if (xClicked) {
      resetOrigin();
    }
  }, [xClicked]);

  return (
    <group ref={groupRef}>
      <group ref={ref}>
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          {/* <Sphere scale={0.1} /> */}
          <Box scale={0.1} />
          {/* <primitive object={new THREE.AxesHelper(10)} /> */}
          {/* <group rotation={[Math.PI, 0, 0]}> */}
          <SimulatedPC />
          {/* </group> */}
        </group>
      </group>
    </group>
  );
};
