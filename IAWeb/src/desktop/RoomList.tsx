import {
  List,
  ListItem,
  IconButton,
  ListItemText,
  Box,
  Button,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { joinRoom, useClient } from "../common/client";
import { Room, EmptyMessage, RoomList } from "../common/message_pb";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useAppDispatch, useAppSelector } from "../hooks";
import { selectUser, setUser } from "../features/user/userSlice";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import React from "react";
import store from "../store";
import { joinExistRoom, newAndJoinRoom } from "../common/room";

export default function RoomDisplayList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const client = useClient();
  const dispatch = useAppDispatch();

  const selector = useAppSelector;
  const user = selector(selectUser);

  const getRoom = () => {
    const stream = client.getAllRooms(new EmptyMessage(), {});
    stream.on("data", (response: RoomList) => {
      setRooms(() => response.getRoomsList());
    });
    stream.on("end", function () {
      console.log("Stream ended");
      getRoom();
    });
  };

  function onJoinRoomClicked(id?: string) {
    if (id != undefined) {
      joinExistRoom(id).then((res) => {
        dispatch(setUser(res));
      })
    } else {
      newAndJoinRoom().then((res) => {
        dispatch(setUser(res));
      })
    }
  }

  useEffect(() => {
    getRoom();
  }, []);

  return (
    <Box
      component={"div"}
      sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}
    >
      <Typography>Exisiting Rooms</Typography>
      <List dense>
        {rooms.map((room, i) => (
          <ListItem
            key={i}
            secondaryAction={
              user?.getRoomid() == room.getId() ? (
                <CheckCircleIcon />
              ) : (
                <IconButton
                  edge="end"
                  onClick={() => onJoinRoomClicked(room.getId())}
                >
                  <AddCircleOutlineIcon />
                </IconButton>
              )
            }
          >
            <ListItemText primary={room.getId()} />
          </ListItem>
        ))}
      </List>

      <Button variant="contained" onClick={() => onJoinRoomClicked()}>
        New Room
      </Button>
    </Box>
  );
}
