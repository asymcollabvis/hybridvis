import { forwardRef, useEffect, useRef } from "react";
import { useController, useXR } from "@react-three/xr";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { Circle, Line, Text } from "@react-three/drei";
import {
  InitialRequest,
  InitialRequest_ClientViewType,
} from "../common/message";
import { useAppDispatch, useAppSelector } from "../hooks";
import { selectUser } from "../features/user/userSlice";
import { pushStatus, useClient } from "../common/client";
import * as THREE from "three";
import useRoomStream from "../common/useRoomStream";
import InteractiveGraph from "./EmbodiedInteractiveGraph";
import Panel from "./UI/Panel";
import * as _ from "lodash";
import NodeCreator from "./NodeCreator";
import UserInstances from "../features/room/UsersInstance";
import { setGraph } from "../features/graph/graphSlice";
import Label from "./UI/Label";
import { useControllerGamepad } from "./interactions/useControllerGamepad";
import Documents from "./UI/Documents";
import Timeline from "../common/timeline/Timeline";
import { useSimulatedPCStore } from "../stores/store";
import CloseDocument from "./CloseDocument";

export default forwardRef<
  THREE.Group,
  {
    dim: InitialRequest_ClientViewType;
    temp?: THREE.Vector3;
    temp2?: THREE.Vector3;
    tempQuat?: THREE.Quaternion;
    tempStatusVector?: THREE.Vector3;
    tempStatusQuat?: THREE.Quaternion;
  }
>(
  (
    {
      dim,
      temp = new THREE.Vector3(),
      temp2 = new THREE.Vector3(),
      tempQuat = new THREE.Quaternion(),
      tempStatusVector = new THREE.Vector3(),
      tempStatusQuat = new THREE.Quaternion(),
    },
    ref
  ) => {
    console.log("rendering scene");

    const { session } = useXR();

    const selector = useAppSelector;
    const dispatch = useAppDispatch();
    const user = selector(selectUser);
    const graphRef = useRef<THREE.Group>(null!);
    const docRef = useRef<THREE.Group>(null!);
    const arrowRef = useRef<THREE.Group>(null!);
    // const selectedText = useDocumentStore(state => state.selectedText);

    const client = useClient();
    const footVisualizerRef = useRef<THREE.Object3D>(null!);
    const roomRef = useRef<THREE.Group>(null!);
    const { player } = useXR();
    const { camera, gl, scene } = useThree();
    // const cameraRef = useRef(camera);
    // const cameraHelper = useHelper(cameraRef, CameraHelper);
    // cameraHelper.current.visible = false;
    // if (cameraHelper.current) {
    //   cameraHelper.current.visible = false;
    // }
    // console.log(cameraHelper.current);
    const leftController = useController("left");
    const minicubeRef = useRef<THREE.Group>(null!);
    // const isMoveNode = useNodeCreateVisualizerStore((state) => state.nodeId);

    const interval = useRef<NodeJS.Timer>();
    const currHeadLookAt = useRef("");

    // useHelper(
    //   graphRef,
    //   THREE.BoxHelper,
    //   selectedText || isMoveNode ? "green" : "black"
    // );
    useRoomStream(dim);

    // const [ready, setReady] = useState(false);
    // useEffect(() => {
    //   if (graphRef.current && !ready) {
    //     // hack to make sure the graph is loaded
    //     setTimeout(() => {
    //       setReady(true);
    //     }, 1000);
    //     console.log("ready", graphRef.current);

    //   }
    // })

    // useEffect(() => {
    //   interval.current = setInterval(() => {
    //     let _camera = gl.xr.isPresenting ? gl.xr.getCamera() : camera;
    //     // push user info to server
    //     pushStatus(
    //       user,
    //       _camera,
    //       graphRef.current,
    //       docRef.current,
    //       tempStatusVector,
    //       tempStatusQuat
    //     );
    //   }, (1 / 10) * 1000); // 10 times per second

    //   return () => {
    //     clearInterval(interval.current);
    //   };
    // }, []);

    useEffect(() => {
      dispatch(setGraph(graphRef.current));
    });

    useEffect(() => {
      // this is the key to make the text clear
      gl.xr.setFramebufferScaleFactor(4);
    }, [gl.xr]);

    // use DataService later
    useEffect(() => {
      console.log("sessoion", session);
      if (session) {
        if (interval.current) {
          clearInterval(interval.current);
        }

        interval.current = setInterval(() => {
          let _camera = gl.xr.isPresenting ? gl.xr.getCamera() : camera;

          // push user info to server
          pushStatus(
            user,
            _camera,
            graphRef.current,
            docRef.current,
            tempStatusVector,
            tempStatusQuat,
            currHeadLookAt.current
          );
        }, (1 / 10) * 1000);
      } else {
        clearInterval(interval.current);
      }
    }, [session]);

    useEffect(() => {
      roomRef.current = scene.getObjectByName("room") as THREE.Group;
      // console.log("room", roomRef.current, scene);
    }, []);

    useFrame(({ raycaster }) => {
      let _camera = gl.xr.isPresenting ? gl.xr.getCamera() : camera;

      // push user info to server
      // pushStatus(
      //   user,
      //   _camera,
      //   graphRef.current
      // );
      // console.log(leftController);

      // locate minicube
      // if (leftController) {
      //   leftController.controller.getWorldDirection(temp);
      //   let pos = leftController.controller
      //     .getWorldPosition(temp2)
      //     .add(temp.multiplyScalar(-0.2));
      //   leftController.controller.getWorldQuaternion(tempQuat);
      //   if (minicubeRef.current) {
      //     minicubeRef.current.position.copy(pos);
      //     minicubeRef.current.quaternion.copy(tempQuat);
      //   }
      // }

      // camera rotation
      // console.log(leftController?.inputSource.gamepad?.axes[2]);
      // let gamepad = leftController?.inputSource.gamepad;
      // if (gamepad) {
      //   if (gamepad.axes[2] > 0.5) {
      //     delayRotateRight();
      //   } else if (gamepad.axes[2] < -0.5) {
      //     delayRotateLeft();
      //   } else {
      //     delayRotateRight.cancel();
      //     delayRotateLeft.cancel();
      //   }
      // }

      // update arrow position
      // _camera.getWorldDirection(temp);
      // _camera.getWorldPosition(temp2);
      // arrowRef.current.position.copy(temp.multiplyScalar(1).add(temp2));

      // update foot visualizer
      raycaster.set(_camera.position, new THREE.Vector3(0, -1, 0));
      let intersects = raycaster.intersectObject(roomRef.current, false);
      if (intersects.length > 0) {
        console.log();
        let pos = intersects[0].point;
        pos.y += 0.01;
        footVisualizerRef.current.position.copy(pos);
      }
      // console.log("camera", _camera.position);

      // update head look at from camera position
      let object = useSimulatedPCStore.getState().object;
      // console.log("object", object);

      if (!object) {
        return;
      }
      _camera.getWorldDirection(temp);
      _camera.getWorldPosition(temp2);
      raycaster.set(_camera.position, temp);
      intersects = raycaster.intersectObject(object);
      // console.log(intersects);

      if (intersects.length > 0) {
        // console.log("interact");

        currHeadLookAt.current = intersects[0].object.name;
      } else {
        currHeadLookAt.current = "";
      }
    });

    return (
      <group ref={ref}>
        <InteractiveGraph
          ref={graphRef}
          position={[0, 2, 0]}
          scale={[0.004, 0.004, 0.004]}
          movable={false}
          fixed={true}
        ></InteractiveGraph>

        {/* <RoomList position={[-0.5, 2, -0.5]}></RoomList> */}
        {/* <Box receiveShadow castShadow></Box> */}
        {user && user.roomId && (
          <>
            {/* <UserList
              position={[-0.6, 1.6, 1]}
              rotation={[0, Math.PI, 0]}
            ></UserList> */}
            <Panel
              position={[-1.5, 1.5, 0]}
              rotation={[0, Math.PI / 2, 0]}
              title={"Task"}
              width={0.5}
              height={0.1}
            >
              <Text
                fontSize={0.02}
                color="black"
                anchorX={"left"}
                anchorY={"top"}
                maxWidth={0.5}
              >
                You have been asked to pursue a line of investigation into ONE
                unexpected illegal activity against wildlife. Explore and figure
                out whos, whats, wheres, whens, whys, and hows.
              </Text>
            </Panel>
            {/* <DocumentCombinedPanel ref={docRef}></DocumentCombinedPanel> */}
            <Documents mode="curve" />
          </>
        )}

        {/* {ready && <NodeCreator graph={graphRef.current} />} */}
        <NodeCreator />

        {/* <Minicube ref={minicubeRef} /> */}

        {/* <VisualGuide ref={arrowRef} graph={() => graphRef.current} /> */}
        {/* {leftController && <Minicube minicubeRef={minicubeRef} />} */}
        {/* <UserInstances></UserInstances> */}

        {/* <ControllerTutorial></ControllerTutorial> */}

        <group
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.1, -0.5]}
          scale={5}
        >
          <Timeline />
        </group>

        {/* <UserMenu /> */}

        <CloseDocument />

        <Circle
          rotation={[-Math.PI / 2, 0, 0]}
          args={[0.1, 16]}
          ref={footVisualizerRef}
        >
          <meshBasicMaterial color="grey" />
        </Circle>
      </group>
    );
  }
);

const leftcontrollerButtons = {
  xr_standard_trigger_pressed_value: {
    label: "Select objects",
    offset: [0, 20, 0],
    position: [0, 0, 0],
  },
  xr_standard_squeeze_pressed_value: {
    label: "Grab objects",
    offset: [20, 0, 0],
    position: [0, 0, 0],
  },
  // xr_standard_thumbstick_pressed_value: {
  //   label: "Rotate",
  //   offset: [0, 20, 0],
  // },
  // x_button_pressed_value: {
  //   label: "Show/Hide MiniCube",
  //   offset: [20, 20, 0],
  // },
  y_button_pressed_value: {
    label: "Show/Hide Help Menu",
    offset: [-20, 0, 0],
  },
  // "y_button_pressed_value",
};
const rightcontrollerButtons = {
  xr_standard_trigger_pressed_value: {
    label: "Select objects",
    offset: [0, -20, 0],
    position: [0, 0, 0],
  },
  xr_standard_squeeze_pressed_value: {
    label: "Grab objects",
    offset: [-20, 0, 0],
    position: [0, 0, 0],
  },
  // "xr_standard_thumbstick_pressed_value",
  // "a_button_pressed_value",
  // "b_button_pressed_value",
};

function ControllerTutorial({
  temp = new THREE.Vector3(),
  quat = new THREE.Quaternion(),
}) {
  console.log("ControllerTutorial");

  const leftController = useController("left");
  const rightController = useController("right");

  const leftButtonsRefs = useRef<{ [key: string]: THREE.Group | null }>({});
  const rightButtonsRefs = useRef<{ [key: string]: THREE.Group | null }>({});

  const leftButtons = useRef<{ [key: string]: THREE.Group }>({});
  const rightButtons = useRef<{ [key: string]: THREE.Group }>({});

  // const [show, setShow] = useState(true);

  const { xClicked, yClicked } = useControllerGamepad("left");

  useFrame(() => {
    Object.keys(leftcontrollerButtons).forEach((button) => {
      leftButtons[button] = leftController?.getObjectByName(button);
      if (leftButtons[button] && leftButtons[button].children.length > 0) {
        // leftButtons[button].getWorldPosition(temp);
        const geometry = leftButtons[button].children[0].geometry;
        geometry.computeBoundingBox();
        geometry.boundingBox.getCenter(temp);
        leftButtons[button].children[0].localToWorld(temp);

        leftButtons[button].getWorldQuaternion(quat);
        leftButtonsRefs.current[button]?.position.copy(temp);
        leftButtonsRefs.current[button]?.quaternion.copy(quat);
      }
    });
    Object.keys(rightcontrollerButtons).forEach((button) => {
      rightButtons[button] = rightController?.getObjectByName(button);

      if (rightButtons[button] && rightButtons[button].children.length > 0) {
        // rightButtons[button].getWorldPosition(temp);
        // compute the bounding box of the object
        const geometry = rightButtons[button].children[0].geometry;
        geometry.computeBoundingBox();
        geometry.boundingBox.getCenter(temp);
        rightButtons[button].children[0].localToWorld(temp);

        rightButtons[button].getWorldQuaternion(quat);
        rightButtonsRefs.current[button]?.position.copy(temp);
        rightButtonsRefs.current[button]?.quaternion.copy(quat);
      }
    });
  });

  return (
    <>
      {Object.keys(leftcontrollerButtons).map((button, i) => (
        <group
          ref={(el) => (leftButtonsRefs.current[button] = el)}
          key={`left${i}`}
        >
          <group
            visible={!yClicked}
            position={leftcontrollerButtons[button].position}
          >
            <Label offset={leftcontrollerButtons[button].offset} maxWidth={1}>
              {leftcontrollerButtons[button].label}
            </Label>
          </group>
        </group>
      ))}
      {Object.keys(rightcontrollerButtons).map((button, i) => (
        <group
          key={`right${i}`}
          ref={(el) => (rightButtonsRefs.current[button] = el)}
        >
          <group
            visible={!yClicked}
            position={rightcontrollerButtons[button].position}
          >
            <Label offset={rightcontrollerButtons[button].offset} maxWidth={1}>
              {rightcontrollerButtons[button].label}
            </Label>
          </group>
        </group>
      ))}
    </>
  );
}
