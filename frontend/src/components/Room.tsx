import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Room() {
  const { roomID } = useParams();
  const navigate = useNavigate();
  const userVideo = useRef<HTMLVideoElement | null>(null);
  const userStream = useRef<MediaStream | null>(null);
  const partnerVideo = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

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

        webSocketRef.current = new WebSocket(`ws://localhost:8000/join?roomID=${roomID}`);

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

  const toggleMute = () => {
    if (userStream.current) {
      userStream.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (userStream.current) {
      userStream.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (partnerVideo.current) {
      partnerVideo.current.volume = newVolume;
    }
  };

  const toggleVolumeSlider = () => {
    setShowVolumeSlider(!showVolumeSlider);
  };

  const leaveRoom = () => {
    if (userStream.current) {
      userStream.current.getTracks().forEach(track => track.stop());
    }
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.close();
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <h1 className="text-2xl font-bold">Room: {roomID}</h1>
          </div>
          <button
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
          >
            Leave Room
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <video
              ref={userVideo}
              className="w-full h-[400px] object-cover rounded-lg shadow-lg"
              autoPlay
              muted
            />
            <div className="absolute bottom-4 left-4 flex space-x-4">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-800'} text-white hover:bg-opacity-80 transition duration-200`}
              >
                {isMuted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${isVideoOff ? 'bg-red-600' : 'bg-gray-800'} text-white hover:bg-opacity-80 transition duration-200`}
              >
                {isVideoOff ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <div className="relative">
                <button
                  onClick={toggleVolumeSlider}
                  className="p-3 rounded-full bg-gray-800 text-white hover:bg-opacity-80 transition duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
                {showVolumeSlider && (
                  <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-gray-800 p-4 rounded-lg shadow-lg">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-white text-center mt-2">
                      {Math.round(volume * 100)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              You
            </div>
          </div>

          <div className="relative">
            <video
              ref={partnerVideo}
              className="w-full h-[400px] object-cover rounded-lg shadow-lg"
              autoPlay
            />
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              Partner
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
