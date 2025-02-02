import { MapControls, View, OrthographicCamera } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { forwardRef, useEffect, useRef } from "react";
import { Provider, ReactReduxContext } from "react-redux";
import { useParams } from "react-router-dom";
import { moveNode, viewType } from "../common/graph";
import useDragToAddNode from "../common/useDragToAddNode";
import { useAppSelector } from "../hooks";
import { Scene } from "./Scene";
import GraphMapControls from "./GraphMapControls";
import GraphLabelInput from "./GraphLabelInput";
import store from "../store";
import {
  useDocumentStore,
  useNodeCreateVisualizerStore,
} from "../stores/store";
import Timeline from "../common/timeline/Timeline";
// import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
// import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";

export function Visualization() {
  console.log("GraphView");

  let { dim } = useParams();

  // const selector = useAppSelector;
  // const selectedText = useDocumentStore(state => state.selectedText);
  // const { dragToAddNode } = useDragToAddNode();
  // const isMoveNode = selector(selectIsMoveNode);
  // const dispatch = useAppDispatch();
  const ref = useRef<HTMLDivElement>(null!);
  const view1 = useRef<HTMLDivElement>(null!);
  const view2 = useRef<HTMLDivElement>(null!);

  // let [canAddNode, setCanAddNode] = React.useState(false);

  return (
    // <ReactReduxContext.Consumer>
    //   {({ store }) => (
    <div
      ref={ref}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <GraphViewContainer ref={view1} />
      {/* <MinimapContainer ref={view2} /> */}
      <div
        ref={view2}
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          // overflow: "visible",
          // transform: showed ? "translateX(0)" : "translateX(100%)",
          width: "900px",
          height: "200px",
          border: `1px solid black`,
        }}
      />

      <Canvas
        eventSource={ref}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        {/* <Provider store={store}> */}
        <Views dim={dim} view1={view1} view2={view2} />
        {/* </Provider> */}
      </Canvas>

      <GraphLabelInput />
    </div>
    // )}
    // </ReactReduxContext.Consumer>
  );
}

function Views({ dim, view1, view2 }) {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    console.log("camera", camera);
  }, [camera]);

  return (
    <>
      <View index={1} track={view1} frames={1}>
        <GraphView dim={dim} />
      </View>

      <View index={2} track={view2} frames={1}>
        <TimelineView />
      </View>
    </>
  );
}

function GraphView({ dim }) {
  let camera = useThree((state) => state.camera);
  const orthCamera = useRef<THREE.OrthographicCamera>(null!);
  const set = useThree((state) => state.set);

  // HACK: the camera is set to default after screen casting without any reason, so we need to set it again
  useEffect(() => {
    console.log("cam", orthCamera.current);

    console.log("graph view camera", camera);
    set({ camera: orthCamera.current });
  }, [camera]);

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, 0, 2]}
        zoom={1000}
        far={50}
        near={0.01}
        name="test2"
        ref={orthCamera}
      />
      <GraphMapControls />
      <Scene dim={viewType(dim)} />
    </>
  );
}

function TimelineView() {
  let camera = useThree((state) => state.camera);
  const orthCamera = useRef<THREE.OrthographicCamera>(null!);
  const set = useThree((state) => state.set);

  // HACK: the camera is set to default after screen casting without any reason, so we need to set it again
  useEffect(() => {
    console.log("cam", orthCamera.current);

    console.log("timeline view camera", camera);
    set({ camera: orthCamera.current });
  }, [camera]);
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, 0, 2]}
        zoom={1000}
        far={50}
        near={0.01}
        name="test"
        ref={orthCamera}
      />
      <MapControls makeDefault screenSpacePanning={true} enableRotate={false} />
      <Timeline />
    </>
  );
}

const GraphViewContainer = forwardRef<HTMLDivElement, {}>(({}, ref) => {
  const selector = useAppSelector;
  const selectedText = useDocumentStore((state) => state.selectedText);
  const { dragToAddNode } = useDragToAddNode();
  const isMoveNode = useNodeCreateVisualizerStore((state) => state.nodeId);
  // const dispatch = useAppDispatch();
  let [canAddNode, setCanAddNode] = React.useState(false);
  const setIsMoveNode = useNodeCreateVisualizerStore(
    (state) => state.setNodeId
  );
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        // border: `3px solid ${selectedText || isMoveNode ? "green" : " white"}`,
      }}
      onPointerEnter={(e) => {
        if (selectedText || isMoveNode) {
          setCanAddNode(true);
        }
      }}
      onPointerLeave={(e) => {
        if (canAddNode || isMoveNode) {
          setCanAddNode(false);
        }
      }}
      onPointerUp={(e) => {
        // if (canAddNode) {
        if (selectedText) {
          dragToAddNode();
        }

        if (isMoveNode) {
          // console.log("moveNode");
          const user = store.getState().user.userInfo;
          if (!user) return;

          // move node
          moveNode(user, isMoveNode);

          setIsMoveNode(undefined);
        }
        // }
      }}
    />
  );
});

// const MinimapContainer = forwardRef<HTMLDivElement, {}>(({}, ref) => {
//   const [showed, setShowed] = useState(true);

//   return (
//     <div
//       style={{
//         position: "absolute",
//         bottom: 8,
//         right: 8,
//         // overflow: "visible",
//         // transform: showed ? "translateX(0)" : "translateX(100%)",
//         width: "400px",
//         height: "400px",
//         border: `1px solid black`,
//       }}
//     >
//       <Box
//         component="div"
//         sx={{
//           position: "absolute",
//           left: 0,
//           top: 500 / 2,
//           transform: "translate(-100%, -50%)",
//           backgroundColor: "white",
//           display: "flex",
//           justifyContent: "center",
//           cursor: "pointer",
//         }}
//         onClick={() => setShowed(!showed)}
//       >
//         {showed ? <KeyboardArrowRightIcon /> : <KeyboardArrowLeftIcon />}
//       </Box>
//       <div
//         ref={ref}
//         style={{ height: "100%", width: "100%", display: showed ? "" : "none" }}
//       ></div>
//     </div>
//   );
// });
