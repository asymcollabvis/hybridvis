import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import BackgroundContext from "../vr/BackgroundContext";
import Trajectory from "./SceneVisualization/Trajectory";

export default function SceneVisualization() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Canvas>
        <OrbitControls makeDefault />
        <BackgroundContext />
        <Stats />

        <Trajectory />
      </Canvas>
    </div>
  );
}
