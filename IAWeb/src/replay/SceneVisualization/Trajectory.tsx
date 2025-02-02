import { useMemo } from "react";
import { useReplayStore } from "../../stores/replayStore";
import * as d3 from "d3";
import { EventType } from "../../../server/common";
import {
  SpatialInfo,
  UserInfo,
  UserInfo_ClientType,
} from "../../common/message";
import { Instance, Instances } from "@react-three/drei";
import { colorScale } from "../ReplayPanel";

export default function Trajectory() {
  const { data } = useReplayStore();

  const poseData = useMemo(() => {
    if (!data) return;

    return Object.entries(data).map(([key, value]) => {
      if (value.data == undefined) return;
      return value.data
        .filter(
          (d) =>
            (d.event == EventType.UserInfo || d.event == EventType.SimPcPose) &&
            d.data.type == UserInfo_ClientType.VR
        )
        .map((d) => {
          if (d.event == EventType.UserInfo) {
            let datum = d.data as UserInfo;
            return {
              position: [
                datum.headSpatialInfo?.position?.x,
                datum.headSpatialInfo?.position?.y,
                datum.headSpatialInfo?.position?.z,
              ],
              quaternion: [
                datum.headSpatialInfo?.rotation?.x,
                datum.headSpatialInfo?.rotation?.y,
                datum.headSpatialInfo?.rotation?.z,
                datum.headSpatialInfo?.rotation?.w,
              ],
              event: d.event,
            };
          } else if (d.event == EventType.SimPcPose) {
            let datum = d.data as SpatialInfo;
            return {
              position: [
                datum.position?.x,
                datum.position?.y,
                datum.position?.z,
              ],
              quaternion: [
                datum.rotation?.x,
                datum.rotation?.y,
                datum.rotation?.z,
                datum.rotation?.w,
              ],
              event: d.event,
            };
          }
        });
    });
  }, [data]);

  return (
    <Instances
      limit={1000000} // Optional: max amount of items (for calculating buffer size)
      range={1000000} // Optional: draw-range
    >
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshBasicMaterial />
      {poseData?.map((data, i) => {
        return data?.map((d, j) => {
          return (
            <Instance
              key={`${i} ${j}`}
              position={d.position}
              quaternion={d.quaternion}
              color={colorScale(d?.event ?? EventType.Join)}
            ></Instance>
          );
        });
      })}
    </Instances>
  );
}
