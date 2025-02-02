import { Box, Button, Card } from "@mui/material";
import React, { useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useClient } from "../common/client";
import { InitialRequest, ReplayMessage } from "../common/message";
import useRoomStream from "../common/useRoomStream";
import {
  setReplayData,
  selectReplayData,
  selectSelectedList,
} from "../features/replay/replaySlice";
import { useAppDispatch, useAppSelector } from "../hooks";
import * as d3 from "d3";
import ReplayEventVisualization from "./ReplayEventVisualization";

import { EventType } from "../../server/common";
import { constructUserKey } from "../common/helper";
import { useReplayStore } from "../stores/replayStore";

export const colorScale = d3
  .scaleOrdinal(d3.schemeAccent)
  .domain(Object.keys(EventType));

export default function ReplayPanel() {
  const dispatch = useAppDispatch();
  const selector = useAppSelector;
  // const { roomId, userId } = useParams();
  const client = useClient();
  // const replayData = selector(selectReplayData);
  const replayList = selector(selectSelectedList);

  const logData = useRef<{ [key: string]: {}[] }>({});
  const [loading, setLoading] = React.useState(false);

  const { data, setData } = useReplayStore();

  // const [data, setData] = React.useState<{}[][]>([]);
  const [dataState, setDataState] = React.useState<{
    [key: string]: {
      data?: any;
      roomId: string;
      userId: string;
    };
  }>({});

  // function computeTotalTime() {
  //   if (!replayData) return;

  //   if (replayData.length === 0) {
  //     return;
  //   }

  //   const first = replayData[0];
  //   const last = replayData[replayData.length - 1];
  //   const firstTime = first.timestamp;
  //   const lastTime = last.timestamp;

  //   return <div>Total time: {lastTime - firstTime}</div>;
  // }

  useEffect(() => {
    if (!replayList) {
      return;
    }

    console.log("fetching replay data");

    setDataState({});

    replayList.forEach((id) => {
      const [userId, roomId] = id.split(" ");
      console.log(userId, roomId);

      loadReplayData(userId, roomId);
    });
  }, [replayList]);

  async function loadReplayData(userId: string, roomId: string) {
    if (userId && roomId) {
      let replayMsg: ReplayMessage = {
        userKey: constructUserKey(userId, roomId),
        msg: "start",
      };
      let stream = client.getReplay(replayMsg);

      for await (const data of stream.responses) {
        let json = JSON.parse(data.msg);
        json.timestamp = Date.parse(json.timestamp);
        let id = `${userId} ${roomId}`;
        if (logData.current[id] === undefined) {
          logData.current[id] = [];
        }
        // if (json.event === EventType.UserInfo) {
        //   return;
        // }
        logData.current[`${userId} ${roomId}`].push(json);
      }

      setDataState((dataState) => ({
        ...dataState,
        [`${userId} ${roomId}`]: {
          roomId: roomId,
          userId: userId,
          data: logData.current[`${userId} ${roomId}`],
        },
      }));

      setData({
        ...data,
        [`${userId} ${roomId}`]: {
          roomId: roomId,
          userId: userId,
          data: logData.current[`${userId} ${roomId}`],
        },
      });

      setLoading(false);
    }
  }

  function render() {
    console.log(Object.keys(dataState));

    return Object.values(dataState).map((value, i) => {
      return (
        <Box component="div" key={i}>
          <div>
            {value.userId} {value.roomId}
          </div>
          <ReplayEventVisualization
            replayData={value.data}
            colorScale={colorScale}
          />
        </Box>
      );
    });
  }

  return (
    <Card sx={{ maxHeight: "100vh", overflow: "auto" }}>
      {loading && <div>Loading...</div>}

      {/* {computeTotalTime()} */}
      {render()}
    </Card>
  );
}
