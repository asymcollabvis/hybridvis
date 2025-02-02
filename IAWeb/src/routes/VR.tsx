import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  Stats,
} from "@react-three/drei";
import { Controllers, XR, VRButton } from "@react-three/xr";
import { Provider, ReactReduxContext } from "react-redux";
import { initConnection, leave } from "../common/client";
import { UserInfo, UserInfo_ClientType } from "../common/message";
import { setUser, setUserEnv, setUserId } from "../features/user/userSlice";
import { useAppDispatch } from "../hooks";
import Scene from "../vr/Scene";
import { useEffect, useRef } from "react";
import React from "react";
import { useParams } from "react-router-dom";
import { viewType } from "../common/graph";
import { Canvas } from "@react-three/fiber";
import BackgroundContext from "../vr/BackgroundContext";
import useHandy from "../vr/useHandy";
import { Hands } from "../vr/interactions/Hands";
import VRStats from "../vr/VRStats";
import { useDocumentLayersStore } from "../stores/documentLayersStore";
import config from "../config";

export default function App() {
  console.log("rendering app");

  const { setCam } = useDocumentLayersStore();
  const documentCameraRef = useRef<THREE.OrthographicCamera>(null!);

  // const query = useQuery();
  let { roomId, userId, dataset, dim } = useParams();
  dataset = dataset ?? "0";

  const dispatch = useAppDispatch();
  const ref = useRef<any>();

  initConnection(UserInfo_ClientType.VR, dataset, roomId, userId).then(
    (res) => {
      dispatch(setUserEnv(UserInfo_ClientType.VR));
      dispatch(setUser(res));
      dispatch(setUserId(res.id));
    }
  );

  useEffect(() => {
    window.addEventListener("beforeunload", () => leave());
    // return () => {
    //   leave();
    // };
  }, []); // mounted

  useEffect(() => {
    console.log("setting cam", documentCameraRef.current);

    setCam(documentCameraRef.current);
  }, [documentCameraRef.current]);

  useEffect(() => {
    document.title = `${roomId} ${userId}`;
  }, [roomId, userId]);

  return (
    <>
      <VRButton />
      <ReactReduxContext.Consumer>
        {({ store }) => (
          <Canvas
            gl={{ localClippingEnabled: true }}
            camera={{
              far: 50,
              near: 0.01,
            }}
            onCreated={({ gl }) => {
              gl.setClearAlpha(0);
              gl.setClearColor(0x000000, 0);
            }}
            // shadows={true}
          >
            <XR>
              <Provider store={store}>
                {/* <PerspectiveCamera makeDefault position={[0, 0, 0]} far={50} near={0.01} /> */}

                <Controllers rayMaterial={{ color: "blue" }} />
                <MyHands rayMaterial={{ color: "blue" }} />
                <OrbitControls makeDefault ref={ref} />
                {/* <FlyControls makeDefault ref={ref} /> */}
                <BackgroundContext />
                <Scene dim={viewType(dim)} />
                {/* <Stats /> */}
                {config.isDebug && <VRStats />}

                <OrthographicCamera
                  ref={documentCameraRef}
                  position={[0, 0, 10]}
                  zoom={10}
                  far={50}
                  near={0.01}
                  name="documentCamera"
                />
              </Provider>
            </XR>
          </Canvas>
        )}
      </ReactReduxContext.Consumer>
    </>
  );
}

const MyHands = (props) => {
  useHandy();
  return <Hands {...props} />;
};

export { MyHands };
