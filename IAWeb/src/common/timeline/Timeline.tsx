import * as THREE from "three";
import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Line, Plane, Sphere, Text } from "@react-three/drei";
import { useGraphStore, useTimelineStore } from "../../stores/store";
import store from "../../store";
import {
  getNodeColor,
  NodeColorMode,
  selectMultipleNodes,
  sendAction,
} from "../graph";
import { useFrame } from "@react-three/fiber";
import { useParams } from "react-router-dom";
import { getNodeIndex } from "../../features/graph/LinksInstance";

// draw a timeline in canvas
export default function Timeline() {
  console.log("rendering timeline");
  const length = 80;

  const { dataset } = useParams();

  const formatTime = useMemo(() => {
    return d3.timeFormat("%Y/%m/%d");
  }, []);

  const timeScale = useMemo(() => {
    return d3
      .scaleTime()
      .domain(
        dataset == "0"
          ? [new Date(2022, 0, 1), new Date(2022, 11, 31)]
          : [new Date(2003, 0, 1), new Date(2004, 11, 31)]
      )
      .range([0, length]);
  }, []);

  //   useEffect(() => {
  //     addData({ date: "2004-05-01", values: ["test"] });
  //   }, []);

  return (
    <group scale={0.01}>
      <group position={[-length / 2, 0, 0]}>
        <group>
          <group position={[timeScale(timeScale.domain()[0]), 0, 0]}>
            <Sphere scale={0.5}></Sphere>
            <group position={[0, -1.5, 0]}>
              <Text color={"black"} anchorX="right" rotation={[0, 0, 45]}>
                {formatTime(timeScale.domain()[0])}
              </Text>
            </group>
          </group>

          <Line
            points={[
              [timeScale(timeScale.domain()[0]), 0, 0],
              [timeScale(timeScale.domain()[1]), 0, 0],
            ]}
            lineWidth={undefined}
          ></Line>
          <group position={[timeScale(timeScale.domain()[1]), 0, 0]}>
            <Sphere scale={0.5}></Sphere>
            <group position={[0, -1.5, 0]}>
              <Text color={"black"} anchorX="right" rotation={[0, 0, 45]}>
                {formatTime(timeScale.domain()[1])}
              </Text>
            </group>
          </group>
        </group>
        <group>
          <Marks timeScale={timeScale} />
        </group>
      </group>
    </group>
  );
}

const Marks = ({
  timeScale,
}: {
  timeScale: d3.ScaleTime<number, number, never>;
}) => {
  const data = useTimelineStore((state) => state.data);
  const { selectedNodeIds } = useGraphStore();
  const marksRef = useRef<THREE.Object3D[]>([]);
  const setNodes = useTimelineStore((state) => state.setNodes);

  const formatTime = useMemo(() => {
    return d3.timeFormat("%Y/%m/%d");
  }, []);

  useEffect(() => {
    console.log("data:", data);
  }, [data]);

  useEffect(() => {
    console.log("selectedNodeIds:", selectedNodeIds);
  }, [selectedNodeIds]);

  const onTimelineNodeClicked = useCallback((nodeId) => {
    let userId = store.getState().user.userInfo?.id;
    let user = store.getState().user.userInfo;
    if (user == undefined || userId == undefined) return;
    let index = getNodeIndex(nodeId, store.getState().graph.nodeIdIndexMap);
    if (index == -1) {
      console.error(`node ${nodeId} not found in timeline`);
      return;
    }
    sendAction(user, index, "timeline");
  }, []);

  useFrame(() => {
    // console.log("marksRef.current:", marksRef.current);

    setNodes(marksRef.current.filter((m) => m));
  });

  function computeData(v: string, splitCharacter = " ", length = 1) {
    const node = store.getState().graph.nodesRaw.find((n) => n.id == v);
    if (node == undefined) return "";

    if (node.data == "document") {
      return +node.id - 10000;
    } else {
      let words = node.data.split(splitCharacter);
      if (words.length < length) return node.data;
      return words.slice(0, length).join(splitCharacter) + "...";
    }
  }

  function filterData(v: string) {
    const node = store.getState().graph.nodesRaw.find((n) => n.id == v);
    if (node == undefined) return "";

    if (node.data == "document") {
      return false;
    }
    return true;
  }

  let count = 0;
  return Object.entries(data).map(([key, value]) => {
    return (
      <group key={key} position={[timeScale(new Date(key)), 0, 0]}>
        <Line
          visible={value.length > 0}
          points={[
            [0, 0, 0],
            [0, (value.length - 1) * 3 + 2, 0],
          ]}
          lineWidth={undefined}
        ></Line>
        <Plane
          visible={false}
          scale={6}
          userData={{ type: "timeNode", nodeIds: value }}
          ref={(el) => {
            marksRef.current[count] = el;
            count++;
          }}
        >
          <meshBasicMaterial attach="material" color="black" />
        </Plane>
        <Sphere
          scale={0.5}
          onClick={() => {
            const user = store.getState().user.userInfo;
            const idIndexMap = store.getState().graph.nodeIdIndexMap;
            if (user == undefined) return;
            // pick all nodes in this time
            let indice = value.map((v) => getNodeIndex(v, idIndexMap));

            selectMultipleNodes(user, indice, "timeline");
          }}
        ></Sphere>
        <group position={[0, -1.5, 0]}>
          <Text color={"black"} anchorX="right" rotation={[0, 0, 45]}>
            {formatTime(new Date(key))}
          </Text>
        </group>
        {value.map((v, i) => {
          return (
            <group position={[0, i * 3 + 3, 0]} key={i}>
              <Plane
                visible={false}
                scale={6}
                ref={(el) => {
                  marksRef.current[count] = el;
                  count++;
                }}
                userData={{ nodeId: v, type: "entityNode" }}
              >
                <meshBasicMaterial attach="material" color="black" />
              </Plane>
              <Sphere onClick={() => onTimelineNodeClicked(v)}>
                <meshBasicMaterial
                  attach="material"
                  color={
                    selectedNodeIds.includes(+v)
                      ? "red"
                      : getNodeColor(
                          store
                            .getState()
                            .graph.nodesRaw.find((n) => n.id == v)!,
                          NodeColorMode.Datatype
                        )
                  }
                />
              </Sphere>
              <Text
                font="/NotoSansSC-Regular.woff"
                overflowWrap="break-word" // added for chinese characters
                color={"black"}
                anchorX="left"
                anchorY="middle"
                position={[1.5, 0, 0]}
              >
                {computeData(v, "", 4)}
              </Text>
            </group>
          );
        })}
      </group>
    );
  });
};
