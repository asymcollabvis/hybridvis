import store from "../store";
import { joinRoom } from "./client";


function newAndJoinRoom() {
    return joinRoom(store.getState().user.userInfo!, new Date().getTime().toString());
}

function joinExistRoom(id: string) {
    return joinRoom(store.getState().user.userInfo!, id)
}

export {
    newAndJoinRoom,
    joinExistRoom,
}