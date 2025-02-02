import { Grid } from "@mui/material";
import React, { useEffect } from "react";
import { Link, Outlet, Route } from "react-router-dom";
import {
  initConnection,
  initReplyConnection,
  useClient,
} from "../common/client";
// import { InitialRequest, RequestById, UserInfo } from "../common/message_pb";
import useRoomStream from "../common/useRoomStream";
import { setUserEnv, setUser, setUserId } from "../features/user/userSlice";
import { useAppDispatch } from "../hooks";
import { ReplayControl } from "../replay/ReplayControl";
import ReplayPanel from "../replay/ReplayPanel";
import SceneVisualization from "../replay/SceneVisualization";

export default function Replay() {
  initReplyConnection();

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <SceneVisualization />
      </div>
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
        }}
      >
        <ReplayControl />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
        }}
      >
        <ReplayPanel />
      </div>
    </div>
  );
}
