import { OrbitControls, Stats } from "@react-three/drei";
import {
  Controllers,
  VRButton,
  XR,
  ARButton,
  Hands,
  XRButton,
} from "@react-three/xr";
import { Provider, ReactReduxContext } from "react-redux";
import { initConnection, leave } from "../common/client";
import { UserInfo, UserInfo_ClientType } from "../common/message";
import { setUser, setUserEnv, setUserId } from "../features/user/userSlice";
import { useAppDispatch } from "../hooks";
import Scene from "../hybrid/Scene";
import { useEffect, useRef } from "react";
import React from "react";
import { useParams } from "react-router-dom";
import { viewType } from "../common/graph";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import SimulatedPC from "../hybrid/SimulatedPC";
import VRStats from "../vr/VRStats";
import { MyHands } from "./VR";
import config from "../config";

const buttonStyles: any = {
  position: "absolute",
  bottom: "24px",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "12px 24px",
  border: "1px solid white",
  borderRadius: "4px",
  background: "rgba(0, 0, 0, 0.1)",
  color: "white",
  font: "normal 0.8125rem sans-serif",
  outline: "none",
  zIndex: 99999,
  cursor: "pointer",
};

export default function App() {
  console.log("rendering app");

  // const query = useQuery();
  let { roomId, userId, dataset } = useParams();
  dataset = dataset ?? "0";

  const dispatch = useAppDispatch();

  initConnection(UserInfo_ClientType.VR, dataset, roomId, userId).then(
    (res) => {
      dispatch(setUserEnv(UserInfo_ClientType.VR));
      dispatch(setUser(res));
      dispatch(setUserId(res.id));
    }
  );

  useEffect(() => {
    window.addEventListener("beforeunload", () => leave());
  }, []); // mounted

  useEffect(() => {
    document.title = `${roomId} ${userId}`;
  }, [roomId, userId]);

  return (
    <>
      <XRButton
        style={buttonStyles}
        mode="AR"
        sessionInit={{
          optionalFeatures: [
            "local-floor",
            "bounded-floor",
            "hand-tracking",
            "layers",
            "hit-test",
            "dom-overlay",
          ],
        }}
      ></XRButton>
      {/* <VRButton /> */}
      <ReactReduxContext.Consumer>
        {({ store }) => (
          <Canvas
            gl={{
              localClippingEnabled: true,
              antialias: true,
            }}
            // camera={{
            //   position: [0, 0, 0],
            // }}
            camera={{
              far: 50,
              near: 0.01,
            }}
            shadows={true}
          >
            <XR>
              <Provider store={store}>
                <Controllers rayMaterial={{ color: "blue" }} />
                <MyHands rayMaterial={{ color: "blue" }} />
                <OrbitControls makeDefault />
                {/* <FlyControls makeDefault ref={ref} /> */}
                <Scene />

                {config.isDebug && <VRStats />}
              </Provider>
            </XR>
          </Canvas>
        )}
      </ReactReduxContext.Consumer>
    </>
  );
}
