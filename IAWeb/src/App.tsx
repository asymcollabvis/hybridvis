import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// const Home = lazy(() => import("./routes/Home"));
import Home from "./routes/Home";
// const Desktop = lazy(() => import("./routes/Desktop"));
import Desktop from "./routes/Desktop";
// const VR = lazy(() => import("./routes/VR"));
import VR from "./routes/VR";
// const Replay = lazy(() => import("./routes/Replay"));
import Replay from "./routes/Replay";
// const ReplayPanel = lazy(() => import("./replay/ReplayPanel"));
import ReplayPanel from "./replay/ReplayPanel";
// const Hybrid = lazy(() => import("./routes/Hybrid"));
import Hybrid from "./routes/Hybrid";

import Test from "./routes/Test";

const App = () => (
  <Router>
    {/* <Suspense fallback={<div>Loading...</div>}> */}
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/desktop/:dim/:dataset/:roomId/:userId"
        element={<Desktop />}
      />
      <Route path="/vr/:dim/:dataset/:roomId/:userId" element={<VR />} />
      <Route path="/hybrid/:dataset/:roomId/:userId" element={<Hybrid />} />
      <Route path="/replay" element={<Replay />}>
        <Route path=":userId/:roomId" element={<ReplayPanel />} />
      </Route>
      <Route
        path="/streampc/:dim/:dataset/:roomId/:userId"
        element={<Desktop isStreamed />}
      />
      <Route path="/test" element={<Test />} />
    </Routes>
    {/* </Suspense> */}
  </Router>
);

export default App;
