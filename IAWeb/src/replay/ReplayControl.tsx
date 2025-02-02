import {
  Button,
  Card,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from "@mui/material";
import React, { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { useClient } from "../common/client";
import { InitialRequest, RequestById } from "../common/message";
import useRoomStream from "../common/useRoomStream";
import { setSelectedList } from "../features/replay/replaySlice";
import { useAppDispatch } from "../hooks";

export function ReplayControl() {
  //   useRoomStream(InitialRequest.ClientViewType.VIEW_2D); // it doesn't matter what we pass here
  const dispatch = useAppDispatch();
  const client = useClient();

  const [records, setRecords] = React.useState<any[]>([]);

  const [checkboxState, setCheckboxState] = React.useState<{
    [id: string]: boolean;
  }>({});
  function handleChange(event) {
    setCheckboxState({
      ...checkboxState,
      [event.target.name]: event.target.checked,
    });
  }

  useEffect(() => {
    client.getReplayList({} as RequestById).then((value) => {
      let res = value.response;
      console.log("getReplayList", res);

      setRecords(res.records);
    });
  }, []);

  function setReplays() {
    console.log(
      "setReplays",
      Object.keys(checkboxState).filter((s) => checkboxState[s])
    );
    dispatch(
      setSelectedList(
        Object.keys(checkboxState).filter((s) => checkboxState[s])
      )
    );
  }

  return (
    <Card sx={{ maxHeight: "300px", overflow: "auto" }}>
      <div>Replay list</div>
      <Button onClick={() => setReplays()}>Get replay</Button>
      <FormGroup>
        {records.map((record) => (
          <FormControlLabel
            key={`${record.userKey.userId} ${record.userKey.roomId}`}
            control={
              <Checkbox
                // checked={checkboxState[`${record.userKey.userId} ${record.userKey.roomId}`]}
                onChange={handleChange}
                name={`${record.userKey.userId} ${record.userKey.roomId}`}
              />
            }
            label={`${record.userKey.userId} ${record.userKey.roomId}`}
          />
        ))}
      </FormGroup>
    </Card>
  );
}
