import React, { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { useClient } from "../common/client";
import { constructUserKeyFromUser } from "../common/helper";
import { RequestById } from "../common/message";
import store from "../store";

export default function useScreenCapture(isStreamed = false) {
  console.log("rendering screen capture");

  const client = useClient();
  //   const videoStreamRef = useRef<HTMLVideoElement>(null!);
  //   const remoteVideoRef = useRef<HTMLVideoElement>(null!);
  //   const offerRef = useRef<HTMLTextAreaElement>(null!);
  //   const answerRef = useRef<HTMLTextAreaElement>(null!);
  const [localStream, setLocalStream] = useState<MediaStream>();
  const [remoteStream] = useState<MediaStream>(new MediaStream());
  const peerConnection = useRef<RTCPeerConnection>(null!);
  const servers = {
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  async function startCapture(displayMediaOptions: DisplayMediaStreamOptions) {
    try {
      let stream = await navigator.mediaDevices.getDisplayMedia(
        displayMediaOptions
      );
      setLocalStream(stream);
      // createOffer();
    } catch (err) {
      console.error(`Error: ${err}`);
    }

    // videoStreamRef.current.srcObject = localStream.current;
  }

  useEffect(() => {
    // if localStream is ready, create offer
    if (localStream && !peerConnection.current) {
      createOffer();
    }

    return () => {};
  }, [localStream]);

  async function createOffer() {
    // console.log("creating offer");

    peerConnection.current = new RTCPeerConnection(servers);

    if (!localStream) return;
    // add stream to peer
    localStream.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream);
    });

    // get stream from remote peer
    // peerConnection.current.ontrack = (event) => {
    //   event.streams[0].getTracks().forEach((track) => {
    //     remoteStream.current.addTrack(track);
    //   });
    // };

    let latestOffer = "";
    peerConnection.current.onicecandidate = (event) => {
      // update offer
      if (event.candidate) {
        // offerRef.current.value = JSON.stringify(
        //   peerConnection.current.localDescription
        // );
        latestOffer = JSON.stringify(peerConnection.current.localDescription);
      } else {
        client.setWebRTCOffer({
          id: latestOffer,
          userKey: constructUserKeyFromUser(userInfo!),
        } as RequestById);
      }
    };

    let offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    let userInfo = store.getState().user.userInfo;
    if (!userInfo) return;
    let roomId = userInfo.roomId;
    if (!roomId) return;

    // offerRef.current.value = JSON.stringify(offer);

    // client.setWebRTCOffer({
    //   id: JSON.stringify(offer),
    //   userKey: constructUserKeyFromUser(userInfo),
    // } as RequestById);

    waitForAnswer();
  }

  async function createAnswer() {
    let userInfo = store.getState().user.userInfo;
    if (!userInfo) return;
    let roomId = userInfo.roomId;
    if (roomId === undefined) return;
    const userKey = constructUserKeyFromUser(userInfo);

    let stream = client.getWebRTCOfferStream({
      userKey: userKey,
    } as RequestById);
    for await (let res of stream.responses) {
      // console.log("got offer");

      peerConnection.current = new RTCPeerConnection(servers);
      // remoteVideoRef.current.srcObject = remoteStream.current;

      // add stream to peer
      // localStream.current.getTracks().forEach((track) => {
      //   peerConnection.current.addTrack(track, localStream.current);
      // });

      // get stream from remote peer
      peerConnection.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      };

      let latestAnswer = "";
      peerConnection.current.onicecandidate = (event) => {
        // update answer
        if (event.candidate) {
          latestAnswer = JSON.stringify(
            peerConnection.current.localDescription
          );
          // answerRef.current.value = answer;
        } else {
          client.setWebRTCAnswer({
            id: latestAnswer,
            userKey: constructUserKeyFromUser(userInfo!),
          } as RequestById);
        }
      };

      let offer = res.data;
      await peerConnection.current.setRemoteDescription(JSON.parse(offer));

      let answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      //   answerRef.current.value = JSON.stringify(answer);
      // client.setWebRTCAnswer({
      //   id: JSON.stringify(answer),
      //   userKey: userKey,
      // } as RequestById);
    }

    console.log("createAnswer stream status", "end");

    createAnswer();
  }

  const setAnswer = async () => {
    let userInfo = store.getState().user.userInfo;
    if (!userInfo) return;
    let roomId = userInfo.roomId;
    if (!roomId) return;
    client
      .getWebRTCAnswer({
        userKey: constructUserKeyFromUser(userInfo),
      } as RequestById)
      .then((value) => {
        let res = value.response;
        let answer = res.data;
        // answerRef.current.value = answer;
        if (answer) {
          // peerConnection.current.close();
          peerConnection.current.setRemoteDescription(JSON.parse(answer));
        }
      });
  };

  const waitForAnswer = async () => {
    let userInfo = store.getState().user.userInfo;
    if (!userInfo) return;
    let roomId = userInfo.roomId;
    if (!roomId) return;
    console.log("stream status", "waiting for answer");

    let stream = client.getWebRTCAnswerStream({
      userKey: constructUserKeyFromUser(userInfo),
    } as RequestById);
    for await (let res of stream.responses) {
      console.log("stream status", res);

      let answer = res.data;
      let data = JSON.parse(answer);
      if (data) {
        // peerConnection.current.close();
        peerConnection.current.setRemoteDescription(data);
        // console.log("got answer", answer);
      }
    }
    // const { status, trailers } = await stream;

    console.log("createOffer stream status", "end");
    createOffer();
  };

  useEffect(() => {
    if (isStreamed) {
      startCapture({
        // video: {
        //   width: { ideal: 4096 },
        //   height: { ideal: 2160 },
        // },
        // video: true,
        audio: true,
        preferCurrentTab: true,
      });
    }
  }, []);

  return {
    remoteStream,
    localStream,
    createOffer,
    createAnswer,
    setAnswer,
    waitForAnswer,
  };
}
