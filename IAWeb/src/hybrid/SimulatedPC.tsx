import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Mask, Plane } from "@react-three/drei";
import useScreenCapture from "../desktop/useScreenCapture";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
// import { pushSimPCPose } from "../common/client";
import { Position, Rotation, Scale, SpatialInfo } from "../common/message";
import store from "../store";
import { useXR } from "@react-three/xr";
import { constructUserKeyFromUser, useDeviceCamera } from "../common/helper";
import { useSimulatedPCStore } from "../stores/store";
import { random } from "lodash";
import { useDocumentLayersStore } from "../stores/documentLayersStore";
import { setSimPcObj } from "../common/client";

export default forwardRef<
  THREE.Group,
  {
    tempVector?: THREE.Vector3;
    tempVector2?: THREE.Vector3;
    tempQuat?: THREE.Quaternion;
    tempQuat2?: THREE.Quaternion;
  }
>(
  (
    {
      tempVector = new THREE.Vector3(),
      tempVector2 = new THREE.Vector3(),
      tempQuat = new THREE.Quaternion(),
      tempQuat2 = new THREE.Quaternion(),
    },
    ref
  ) => {
    const [video] = useState(() => {
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      // video.play();
      return video;
    });
    const { remoteStream, createAnswer } = useScreenCapture();
    const planeRef = useRef<any>();
    const ratio = (1 / 1000) * 0.6;
    const groupRef = useRef<THREE.Group>(null!);
    const setObject = useSimulatedPCStore((state) => state.setObject);
    const { addLayer } = useDocumentLayersStore();
    const layerRef = useRef<any>(null);
    // const monitorWidth = 0.61; // 27" monitor
    const monitorWidth = 0.71; // 32" monitor

    useImperativeHandle(ref, () => groupRef.current);

    useEffect(() => {
      createAnswer();
    }, []);

    useEffect(() => {
      // set sim PC obj for logging
      setSimPcObj(groupRef.current);
    }, []);

    useEffect(() => {
      if (remoteStream) {
        video.srcObject = remoteStream;
        // video.src = "/BigBuckBunny.mp4"
        // video.play();

        video.addEventListener("loadedmetadata", () => {
          // console.log(video.videoHeight, video.videoWidth);
          planeRef.current.scale.set(
            monitorWidth,
            (monitorWidth / video.videoWidth) * video.videoHeight,
            1
          );
          // console.log(planeRef.current.scale);

          // video.play();
        });
      }
    }, [remoteStream, video]);

    useFrame((state, delta, xrFrame) => {
      // console.log("adding video layer", video.readyState, video.paused);

      if (video.readyState >= 2 && video.paused) {
        video.play();
        layerRef.current = {
          layerType: "quad",
          video: video,
          position: new THREE.Vector3(0, 0, 0), // initial position
          rotation: new THREE.Quaternion(0, 0, 0, 1), // initial rotation
          config: {
            width: monitorWidth / 2,
            height: ((monitorWidth / video.videoWidth) * video.videoHeight) / 2,
            layout: "mono",
          },
        };
        // console.log("video ready", layerRef.current);

        addLayer(layerRef.current);
        console.log("adding video layer", groupRef.current);
      }

      if (!video.paused && layerRef.current && layerRef.current.layer) {
        // console.log(layerRef.current.layer);
        const simPcObj = groupRef.current.getObjectByName("simPC");
        if (simPcObj) {
          simPcObj.getWorldPosition(tempVector2);
          simPcObj.getWorldQuaternion(tempQuat2);
          layerRef.current.layer.transform = new XRRigidTransform(
            {
              x: tempVector2.x,
              y: tempVector2.y,
              z: tempVector2.z,
            },
            {
              x: tempQuat2.x,
              y: tempQuat2.y,
              z: tempQuat2.z,
              w: tempQuat2.w,
            }
          );
        }
      }
    });

    return (
      <group ref={groupRef}>
        <DetectedPlanes />
        <mesh
          position={[
            0,
            (video.videoHeight == 0 ? 1 : video.videoHeight * ratio) / 2,
            0,
          ]}
          ref={(el: THREE.Object3D) => {
            setObject(el);
            planeRef.current = el;
          }}
          name="simPC"
          renderOrder={-11}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial colorWrite={false} />
        </mesh>
        {/* <Plane
          position={[0, 0.5, 0]}
          ref={(el: THREE.Object3D) => {
            setObject(el);
            planeRef.current = el;
          }}
          name="simPC"
        >
          <meshBasicMaterial attach="material" map={null} toneMapped={false}>
            <videoTexture
              attach="map"
              args={[video]}
              // anisotropy={16}
              // minFilter={THREE.NearestFilter}
              // magFilter={THREE.NearestFilter}
              // generateMipmaps={false}
            />
          </meshBasicMaterial>
        </Plane> */}
      </group>
    );
  }
);

function DetectedPlanes() {
  console.log("DetectedPlanes");

  // const { gl } = useThree();

  // useEffect(() => {
  //   console.log("planes", gl.xr.getPlanes());

  // }, []);

  const groupRef = useRef<THREE.Group>(null!);
  // const camera = useDeviceCamera();

  useFrame(() => {
    // make the mask visible only when the camera is close to the AR plane
    // let cameraPosition = new THREE.Vector2(camera.position.x, camera.position.z);
    // let maskPosition = new THREE.Vector2(
    //   groupRef.current.position.x,
    //   groupRef.current.position.z
    // );
    // let distance = cameraPosition.distanceTo(maskPosition);
    // if (distance < 1) {
    //   groupRef.current.visible = true;
    // } else {
    //   groupRef.current.visible = false;
    // }
    // console.log(distance);
  });

  return (
    <group ref={groupRef}>
      {/* <primitive object={new THREE.AxesHelper(5)} /> */}
      <Mask
        id={1}
        position={[0, 0, 0.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, 0.5, 1]}
      >
        <planeGeometry />
      </Mask>
    </group>
  );
}
