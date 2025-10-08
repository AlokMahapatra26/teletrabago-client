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

interface PeerConnectionRef {
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
  const [peers, setPeers] = useState<Map<string, PeerConnectionRef>>(new Map());
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const user = useAuthStore((state) => state.user);
  const userName = user?.full_name || user?.email || 'Anonymous';

  // Helper: flush queued ICE candidates once remote desc is set
  async function flushCandidates(peerConnection: RTCPeerConnection, socketId: string) {
    const queued = pendingCandidates.current.get(socketId) || [];
    for (const c of queued) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.error('addIceCandidate error:', e);
      }
    }
    pendingCandidates.current.delete(socketId);
  }

  

  // Initialize socket + local media
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        if (!isMounted) return;
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const socketIO = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000', {
          path: '/socket.io/',
        });
        setSocket(socketIO);

        socketIO.on('connect', () => {
          socketIO.emit('join-room', {
            roomName,
            userId: user?.id || 'anonymous',
            userName,
          });
        });

        socketIO.on('existing-users', async (users: any[]) => {
          for (const user of users) {
            await createPeer(user.socketId, true, stream, socketIO);
          }
        });

        socketIO.on('user-joined', async ({ socketId, userName }: any) => {
          await createPeer(socketId, false, stream, socketIO);
        });

        socketIO.on('offer', async ({ offer, from }: any) => {
          await handleOffer(offer, from, stream, socketIO);
        });

        socketIO.on('answer', async ({ answer, from }: any) => {
          const peer = peers.get(from)?.peerConnection;
          if (peer) {
            await peer.setRemoteDescription(new RTCSessionDescription(answer));
            await flushCandidates(peer, from);
          }
        });

        socketIO.on('ice-candidate', async ({ candidate, from }: any) => {
          const peer = peers.get(from)?.peerConnection;
          if (peer && peer.remoteDescription && peer.remoteDescription.type) {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error('addIceCandidate error:', e);
            }
          } else {
            const arr = pendingCandidates.current.get(from) || [];
            arr.push(candidate);
            pendingCandidates.current.set(from, arr);
          }
        });

        socketIO.on('user-left', ({ socketId }: any) => {
          const peer = peers.get(socketId);
          if (peer) {
            peer.peerConnection.close();
            peers.delete(socketId);
            setPeers(new Map(peers));
          }
          remotePeers.delete(socketId);
          setRemotePeers(new Map(remotePeers));
        });

        socketIO.on('user-video-toggle', ({ socketId, enabled }: any) => {
          const rp = remotePeers.get(socketId);
          if (rp) {
            rp.videoEnabled = enabled;
            setRemotePeers(new Map(remotePeers));
          }
        });

        socketIO.on('user-audio-toggle', ({ socketId, enabled }: any) => {
          const rp = remotePeers.get(socketId);
          if (rp) {
            rp.audioEnabled = enabled;
            setRemotePeers(new Map(remotePeers));
          }
        });
      } catch (error) {
        alert('Failed to access camera/mic');
      }
    }

    init();
    return () => {
      isMounted = false;
      if (localStream) localStream.getTracks().forEach((track) => track.stop());
      if (socket) {
        socket.emit('leave-room', { roomName });
        socket.disconnect();
      }
      peers.forEach((peer) => peer.peerConnection.close());
    };
    // eslint-disable-next-line
  }, []);

  // Create Peer Connection
  const createPeer = async (
    socketId: string,
    isInitiator: boolean,
    stream: MediaStream,
    socketIO: Socket
  ) => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate)
        socketIO.emit('ice-candidate', {
          candidate: event.candidate,
          to: socketId,
        });
    };

    peerConnection.ontrack = (event) => {
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

    if (isInitiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketIO.emit('offer', { offer, to: socketId });
    }

    return peerConnection;
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    from: string,
    stream: MediaStream,
    socketIO: Socket
  ) => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate)
        socketIO.emit('ice-candidate', {
          candidate: event.candidate,
          to: from,
        });
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
    await flushCandidates(peerConnection, from);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socketIO.emit('answer', { answer, to: from });

    peers.set(from, { peerConnection, stream: null });
    setPeers(new Map(peers));
  };

  // === Controls ===

  const toggleVideo = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
      socket?.emit('toggle-video', { roomName, enabled: track.enabled });
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
      socket?.emit('toggle-audio', { roomName, enabled: track.enabled });
    }
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      peers.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setIsScreenSharing(true);
      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      peers.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      setIsScreenSharing(false);
    }
  };

  const leaveCall = () => {
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    socket?.emit('leave-room', { roomName });
    socket?.disconnect();
    peers.forEach((p) => p.peerConnection.close());
    onLeave();
  };

  // === UI ===
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div
          className={`grid gap-4 h-full ${
            remotePeers.size === 0
              ? 'grid-cols-1'
              : remotePeers.size === 1
              ? 'grid-cols-2'
              : remotePeers.size <= 4
              ? 'grid-cols-2'
              : 'grid-cols-3'
          }`}
        >
          {/* Local video */}
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

          {/* Remote videos */}
          {Array.from(remotePeers.values()).map((rp) => (
            <Card key={rp.socketId} className="relative overflow-hidden">
              <video
                autoPlay
                playsInline
                ref={(v) => {
                  if (v && rp.stream) v.srcObject = rp.stream;
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4">
                <Badge variant="secondary">{rp.userName}</Badge>
              </div>
              {!rp.videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <VideoOff className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {!rp.audioEnabled && (
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
