import { Box, Card } from "@mui/material";
import { Canvas } from "@react-three/fiber";
import React from "react";
import { Provider, ReactReduxContext } from "react-redux";
import { InitialRequest, InitialRequest_ClientViewType } from "../common/message";
import Graph from "../features/graph/StaticGraph";
import UserInstances from "../features/room/UsersInstance";
import KeyboardArrowRightSharpIcon from '@mui/icons-material/KeyboardArrowRightSharp';
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";

export default function Minimap({}) {
  const [showed, setShowed] = React.useState(true);

  return (
    <Card
      sx={{
        position: "absolute",
        bottom: 8,
        right: 0,
        zIndex: 16777272,
        overflow: "visible",
        transform: showed ? "translateX(0)" : "translateX(100%)",
        width: "400px",
        height: "400px",
      }}
    >
      <Box
        component="div"
        sx={{
          position: "absolute",
          left: 0,
          top: 400 / 2,
          transform: "translate(-100%, -50%)",
          backgroundColor: "white",
          display: "flex",
          justifyContent: "center",
          cursor: "pointer",
        }}
        onClick={() => setShowed(!showed)}
      >
        {showed ? <KeyboardArrowRightSharpIcon /> : <KeyboardArrowLeftIcon />}
      </Box>
      {/* <ReactReduxContext.Consumer>
        {({ store }) => ( */}
          <Canvas
            style={{
              width: "100%",
              height: "100%",
            }}
            orthographic
            camera={{ far: 50, near: 0.01, zoom: 80, position: [0, 0, 4] }}
          >
            {/* <Provider store={store}> */}
              <Graph
                dim={InitialRequest_ClientViewType.VIEW_2D}
                scale={[0.005, 0.005, 0.005]}
                showLabels={false}
              />

              <UserInstances
                showCameraPos={false}
                showSelf={true}
                showOther={false}
              ></UserInstances>
            {/* </Provider> */}
          </Canvas>
        {/* )}
      </ReactReduxContext.Consumer> */}
    </Card>
  );
}