'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface VideoCallRoomProps {
  roomName: string;
  onLeave: () => void;
}

interface PeerConnection {
  peerConnection: RTCPeerConnection;
  stream: MediaStream | null;
}

interface RemotePeer {
  socketId: string;
  userId: string;
  userName: string;
  stream: MediaStream | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function VideoCallRoom({ roomName, onLeave }: VideoCallRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const user = useAuthStore((state) => state.user);
  const userName = user?.full_name || user?.email || 'Anonymous';

  // Initialize media and socket
  useEffect(() => {
    const init = async () => {
      try {
        // Get user media
        const stream = await navigator.mediaDevices.enumerateDevices().then(devices => {
          const droidCam = devices.find(d => d.label.includes('DroidCam'));
          const constraints = droidCam
            ? { video: { deviceId: { exact: droidCam.deviceId } }, audio: true }
            : { video: true, audio: true };
          return navigator.mediaDevices.getUserMedia(constraints);
        });

        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Connect to signaling server
        const socketInstance = io('http://localhost:5000', {
          path: '/socket.io/',
        });

        socketInstance.on('connect', () => {
          console.log('✅ Connected to signaling server');

          // Join room
          socketInstance.emit('join-room', {
            roomName,
            userId: user?.id || 'anonymous',
            userName,
          });
        });

        // Handle existing users
        socketInstance.on('existing-users', async (users: any[]) => {
          console.log('👥 Existing users:', users);

          for (const user of users) {
            await createPeerConnection(user.socketId, true, stream, socketInstance);
          }
        });

        // Handle new user joined
        socketInstance.on('user-joined', async ({ socketId, userName }: any) => {
          console.log('👤 User joined:', userName);
          await createPeerConnection(socketId, false, stream, socketInstance);
        });

        // Handle offer
        socketInstance.on('offer', async ({ offer, from }: any) => {
          console.log('📥 Received offer from:', from);
          await handleOffer(offer, from, stream, socketInstance);
        });

        // Handle answer
        socketInstance.on('answer', async ({ answer, from }: any) => {
          console.log('📥 Received answer from:', from);
          const peer = peers.get(from);
          if (peer) {
            await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        // Handle ICE candidate
        socketInstance.on('ice-candidate', async ({ candidate, from }: any) => {
          const peer = peers.get(from);
          if (peer && candidate) {
            await peer.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

        // Handle user left
        socketInstance.on('user-left', ({ socketId }: any) => {
          console.log('👋 User left:', socketId);
          const peer = peers.get(socketId);
          if (peer) {
            peer.peerConnection.close();
            peers.delete(socketId);
            setPeers(new Map(peers));
          }
          remotePeers.delete(socketId);
          setRemotePeers(new Map(remotePeers));
        });

        // Handle video toggle
        socketInstance.on('user-video-toggle', ({ socketId, enabled }: any) => {
          const remotePeer = remotePeers.get(socketId);
          if (remotePeer) {
            remotePeer.videoEnabled = enabled;
            setRemotePeers(new Map(remotePeers));
          }
        });

        // Handle audio toggle
        socketInstance.on('user-audio-toggle', ({ socketId, enabled }: any) => {
          const remotePeer = remotePeers.get(socketId);
          if (remotePeer) {
            remotePeer.audioEnabled = enabled;
            setRemotePeers(new Map(remotePeers));
          }
        });

        setSocket(socketInstance);
      } catch (error) {
        console.error('Failed to initialize video call:', error);
        alert('Failed to access camera/microphone. Please grant permissions.');
      }
    };

    init();

    return () => {
      // Cleanup
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (socket) {
        socket.emit('leave-room', { roomName });
        socket.disconnect();
      }
      peers.forEach((peer) => {
        peer.peerConnection.close();
      });
    };
  }, []);

  const createPeerConnection = async (
    socketId: string,
    isInitiator: boolean,
    stream: MediaStream,
    socketInstance: Socket
  ) => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream to peer connection
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketInstance.emit('ice-candidate', {
          candidate: event.candidate,
          to: socketId,
        });
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('📥 Received remote track from:', socketId);
      const remoteStream = event.streams[0];

      setRemotePeers((prev) => {
        const newPeers = new Map(prev);
        const existing = newPeers.get(socketId);
        newPeers.set(socketId, {
          socketId,
          userId: existing?.userId || '',
          userName: existing?.userName || 'User',
          stream: remoteStream,
          videoEnabled: existing?.videoEnabled ?? true,
          audioEnabled: existing?.audioEnabled ?? true,
        });
        return newPeers;
      });
    };

    peers.set(socketId, { peerConnection, stream: null });
    setPeers(new Map(peers));

    // Create offer if initiator
    if (isInitiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketInstance.emit('offer', {
        offer,
        to: socketId,
      });
    }

    return peerConnection;
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    from: string,
    stream: MediaStream,
    socketInstance: Socket
  ) => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketInstance.emit('ice-candidate', {
          candidate: event.candidate,
          to: from,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemotePeers((prev) => {
        const newPeers = new Map(prev);
        const existing = newPeers.get(from);
        newPeers.set(from, {
          socketId: from,
          userId: existing?.userId || '',
          userName: existing?.userName || 'User',
          stream: remoteStream,
          videoEnabled: existing?.videoEnabled ?? true,
          audioEnabled: existing?.audioEnabled ?? true,
        });
        return newPeers;
      });
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socketInstance.emit('answer', {
      answer,
      to: from,
    });

    peers.set(from, { peerConnection, stream: null });
    setPeers(new Map(peers));
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);

      if (socket) {
        socket.emit('toggle-video', {
          roomName,
          enabled: videoTrack.enabled,
        });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);

      if (socket) {
        socket.emit('toggle-audio', {
          roomName,
          enabled: audioTrack.enabled,
        });
      }
    }
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      peers.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Replace local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      setIsScreenSharing(true);

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Failed to share screen:', error);
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];

      peers.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      setIsScreenSharing(false);
    }
  };

  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (socket) {
      socket.emit('leave-room', { roomName });
      socket.disconnect();
    }
    peers.forEach((peer) => {
      peer.peerConnection.close();
    });
    onLeave();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className={`grid gap-4 h-full ${remotePeers.size === 0 ? 'grid-cols-1' :
            remotePeers.size === 1 ? 'grid-cols-2' :
              remotePeers.size <= 4 ? 'grid-cols-2' :
                'grid-cols-3'
          }`}>
          {/* Local Video */}
          <Card className="relative overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4">
              <Badge variant="default">You ({userName})</Badge>
            </div>
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <VideoOff className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </Card>

          {/* Remote Videos */}
          {Array.from(remotePeers.values()).map((remotePeer) => (
            <Card key={remotePeer.socketId} className="relative overflow-hidden">
              <video
                autoPlay
                playsInline
                ref={(video) => {
                  if (video && remotePeer.stream) {
                    video.srcObject = remotePeer.stream;
                  }
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4">
                <Badge variant="secondary">{remotePeer.userName}</Badge>
              </div>
              {!remotePeer.videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <VideoOff className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {!remotePeer.audioEnabled && (
                <div className="absolute top-4 right-4">
                  <MicOff className="h-5 w-5 text-destructive" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t-2 border-border p-4 bg-muted/30">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={audioEnabled ? 'default' : 'destructive'}
            size="lg"
            onClick={toggleAudio}
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={videoEnabled ? 'default' : 'destructive'}
            size="lg"
            onClick={toggleVideo}
          >
            {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={isScreenSharing ? 'default' : 'outline'}
            size="lg"
            onClick={isScreenSharing ? stopScreenShare : shareScreen}
          >
            <Monitor className="h-5 w-5" />
          </Button>

          <Button variant="destructive" size="lg" onClick={leaveCall}>
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
