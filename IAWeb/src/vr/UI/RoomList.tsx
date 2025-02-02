import { useEffect, useState } from "react";
import { joinRoom, useClient } from "../../common/client";
import { Room, EmptyMessage, RoomList } from "../../common/message_pb";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectUser, setUser } from "../../features/user/userSlice";
import React from "react";
import Button from "./Button";
import Panel from "./Panel";
import { Text } from "@react-three/drei";
import { joinExistRoom, newAndJoinRoom } from "../../common/room";

export default function RoomDisplayList({ position }) {
  console.log("RoomList");

  let [rooms, setRooms] = useState<Room[]>([]);
  const client = useClient();
  const dispatch = useAppDispatch();

  const selector = useAppSelector;
  const user = selector(selectUser);

  const getRoom = () => {
    const stream = client.getAllRooms(new EmptyMessage(), {});
    stream.on("data", (response: RoomList) => {
      console.log("data", response.getRoomsList().length);
      setRooms(() => response.getRoomsList());
      // rooms = response.getRoomsList();
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
      });
    } else {
      newAndJoinRoom().then((res) => {
        dispatch(setUser(res));
      });
    }
  }

  useEffect(() => {
    getRoom();
  }, []);

  useEffect(() => {
    console.log("rooms", rooms);
  }, [rooms]);

  return (
    <Panel offset={0.015} position={position} height={0.15}>
      <Text fontSize={0.01} color="black" anchorX={"left"} anchorY={"top"}>
        Room List Panel
      </Text>

      {rooms.map((room, i) => (
        <Button
          width={0.08}
          key={i}
          onClick={() => onJoinRoomClicked(room.getId())}
        >
          {room.getId()}
        </Button>
      ))}

      <Button onClick={() => onJoinRoomClicked()}>New Room</Button>
    </Panel>
  );
}
