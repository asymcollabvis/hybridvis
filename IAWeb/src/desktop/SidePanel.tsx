import { Grid } from "@mui/material";
import React from "react";
import DocumentPanel from "./DocumentPanel";
import UserList from "./UserList";

export default function SidePanel() {
  return (
    <div style={{height: "100%", display: "flex", flexDirection:"column"}}>
      <div>
        <UserList></UserList>
      </div>
      {/* <Grid item xs>
                <RoomList></RoomList>
              </Grid> */}
      {/* <Grid item xs>
                <User></User>
              </Grid> */}
      {/* <Grid item xs>
                <ControlPanel></ControlPanel>
              </Grid> */}
      <DocumentPanel />
    </div>
  );
}
