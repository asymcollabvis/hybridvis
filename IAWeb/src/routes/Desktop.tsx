import { useEffect, useRef } from "react";
import { initConnection, leave } from "../common/client";
import { UserInfo, UserInfo_ClientType } from "../common/message";
import { useAppDispatch } from "../hooks";
import { setUser, setUserEnv, setUserId } from "../features/user/userSlice";
import React from "react";
import { AppBar, Toolbar, Typography, Grid } from "@mui/material";
import { useParams } from "react-router-dom";
import Minimap from "../desktop/MinimapOld";
import SidePanel from "../desktop/SidePanel";
import { Visualization } from "../desktop/GraphView";
import useScreenCapture from "../desktop/useScreenCapture";

export default function App({ isStreamed = false }: { isStreamed?: boolean }) {
  console.log("rendering app");
  const dispatch = useAppDispatch();

  let { roomId, userId, dataset } = useParams();
  dataset = dataset ?? "0";

  initConnection(UserInfo_ClientType.DESKTOP, dataset, roomId, userId).then(
    (res) => {
      dispatch(setUserEnv(UserInfo_ClientType.DESKTOP));
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
    <div
      style={{
        backgroundColor: "white",
        height: "100vh",
        position: "relative",
      }}
    >
      <div style={{ height: "100%" , display: "flex", flexDirection: "column"}}>
        <div>
          <AppBar position="static" elevation={0}>
            <Toolbar variant="dense">
              <Typography variant="h6" component="div">
                PC Interface for Visual Problem-solving
              </Typography>
            </Toolbar>
          </AppBar>
        </div>
        <div style={{ flexGrow: 1, minHeight:0 }}>
          <div style={{display: "flex", height: "100%"}}>
            <div style={{width: "30%", height: "100%"}}>
              <SidePanel />
            </div>
            <div style={{width: "70%", height: "100%"}}>
              <Visualization />
            </div>
          </div>
        </div>
      </div>

      {/* old minimap */}
      {/* See the z-index to overlay all canvas html elements, referring to https://github.com/pmndrs/drei#html */}
      <Minimap></Minimap>

      <ScreenCapture isStreamed={isStreamed} />
    </div>
  );
}

export function ScreenCapture({
  isStreamed = false,
}: {
  isStreamed?: boolean;
}) {
  const { localStream } = useScreenCapture(isStreamed);
  const videoStreamRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoStreamRef.current && localStream) {
      videoStreamRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return <></>;
  // <>{isStreamed && (
  //   <div>
  //     <video
  //       style={{ width: 300, height: 150 }}
  //       ref={videoStreamRef}
  //       autoPlay={true}
  //     />
  //     {/* <button
  //         onClick={() => {
  //           createOffer();
  //         }}
  //       >
  //         Create Offer
  //       </button> */}
  //     <button
  //       style={{ position: "fixed", bottom: 0, left: 0 }}
  //       onClick={() => {
  //         setAnswer();
  //       }}
  //     >
  //       Set Answer
  //     </button>
  //   </div>
  // )}</>;
}
