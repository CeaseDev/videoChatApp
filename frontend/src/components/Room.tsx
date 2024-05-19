import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

export default function Room() {
  const { roomID } = useParams();
  const userVideo = useRef<HTMLVideoElement | null>(null);
  const userStream = useRef<MediaStream | null>(null);
  const partnerVideo = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return stream;
    } catch (error) {
      console.error("Error opening camera:", error);
      return null;
    }
  };

  useEffect(() => {
    openCamera().then((stream) => {
      if (stream) {
        userVideo.current!.srcObject = stream;
        userStream.current = stream;

        webSocketRef.current = new WebSocket(`ws://ec2-3-109-124-231.ap-south-1.compute.amazonaws.com/join?roomID=${roomID}`);

        webSocketRef.current.addEventListener("open", () => {
          webSocketRef.current!.send(JSON.stringify({ join: true }));
        });

        webSocketRef.current.addEventListener("message", async (e) => {
          const message = JSON.parse(e.data);

          if (message.join) {
            connectUser();
          }

          if (message.offer) {
            handleOffer(message.offer);
          }

          if (message.answer) {
            console.log("Receiving Answer");
            await peerRef.current!.setRemoteDescription(new RTCSessionDescription(message.answer));
          }

          if (message.iceCandidate) {
            console.log("Receiving and Adding ICE Candidate");
            try {
              await peerRef.current!.addIceCandidate(message.iceCandidate);
            } catch (err) {
              console.log("Error Receiving ICE Candidate", err);
            }
          }
        });
      }
    });

    return () => {
      // Cleanup WebSocket and peer connection on component unmount
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      if (peerRef.current) {
        peerRef.current.close();
      }
    };
  },);

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    console.log("Received Offer, Creating Answer");
    peerRef.current = createPeer();

    await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));

    userStream.current!.getTracks().forEach((track) => {
      peerRef.current!.addTrack(track, userStream.current!);
    });

    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);

    webSocketRef.current!.send(JSON.stringify({ answer: peerRef.current.localDescription }));
  };

  const connectUser = async () => {
    peerRef.current = createPeer();
    userStream.current!.getTracks().forEach((track) => {
      peerRef.current?.addTrack(track, userStream.current!);
    });
  };

  const createPeer = () => {
    console.log("Creating Peer Connection");
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onnegotiationneeded = handleNegotiationNeeded;
    peer.onicecandidate = handleIceCandidateEvent;
    peer.ontrack = handleTrackEvent;

    return peer;
  };

  const handleNegotiationNeeded = async () => {
    console.log("Creating Offer");

    try {
      const myOffer = await peerRef.current!.createOffer();
      await peerRef.current!.setLocalDescription(myOffer);

      webSocketRef.current!.send(JSON.stringify({ offer: peerRef.current!.localDescription }));
    } catch (err) {
      console.log(err);
    }
  };

  const handleIceCandidateEvent = (e: RTCPeerConnectionIceEvent) => {
    console.log("Found Ice Candidate");
    if (e.candidate) {
      webSocketRef.current!.send(JSON.stringify({ iceCandidate: e.candidate }));
    }
  };

  const handleTrackEvent = (e: RTCTrackEvent) => {
    console.log("Received Tracks");
    partnerVideo.current!.srcObject = e.streams[0];
  };

  return (
    <div className="flex justify-center items-center mt-[30vh] gap-20">
      <video ref={userVideo} className="w-[30rem] h-[30rem] border-2 border-red-300 rounded-lg" autoPlay muted />
      <video ref={partnerVideo} className="w-[30rem] h-[30rem] border-2 border-red-300 rounded-lg" autoPlay />
    </div>
  );
}
