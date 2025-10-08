'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const user = useAuthStore((state) => state.user);
  const userName = user?.full_name || user?.email || 'Anonymous';

  async function flushCandidates(peerConnection: RTCPeerConnection, socketId: string) {
    const queued = pendingCandidates.current.get(socketId);
    if (queued) {
      for (const candidate of queued) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding received ICE candidate', e);
        }
      }
      pendingCandidates.current.delete(socketId);
    }
  }

  const updateRemotePeer = (
    socketId: string,
    update: Partial<Omit<RemotePeer, 'socketId'>>
  ) => {
    setRemotePeers((prev) => {
      const next = new Map(prev);
      const existing = next.get(socketId);
      const newPeer = {
        socketId,
        userId: update.userId ?? existing?.userId ?? '',
        userName: update.userName ?? existing?.userName ?? 'Unknown User',
        stream: update.stream ?? existing?.stream ?? null,
        videoEnabled: update.videoEnabled ?? existing?.videoEnabled ?? true,
        audioEnabled: update.audioEnabled ?? existing?.audioEnabled ?? true,
      };
      next.set(socketId, newPeer);
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;

    async function start() {
      if (!user || !user.id) {
        console.warn('User info not ready, waiting...');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        if (!mounted) return;

        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const newSocket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000', {
          path: '/socket.io',
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
          console.log('Socket connected, joining room:', roomName);
          newSocket.emit('join-room', {
            roomName,
            userId: user.id,
            userName,
          });
        });

        newSocket.on('existing-users', (users: any[]) => {
          console.log('Existing users:', users);
          users.forEach((remoteUser) => {
            updateRemotePeer(remoteUser.socketId, {
              userId: remoteUser.userId,
              userName: remoteUser.userName,
            });
            createPeer(remoteUser.socketId, true, stream, newSocket);
          });
        });

        newSocket.on('user-joined', ({ socketId, userName, userId }) => {
          console.log('User joined:', { socketId, userName, userId });
          updateRemotePeer(socketId, { userName, userId });
          createPeer(socketId, false, stream, newSocket);
        });

        newSocket.on('offer', async ({ offer, from }) => {
          await handleOffer(offer, from, stream, newSocket);
        });

        newSocket.on('answer', async ({ answer, from }) => {
          const pcRef = peers.get(from);
          if (!pcRef) return;
          try {
            await pcRef.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            await flushCandidates(pcRef.peerConnection, from);
          } catch (e) {
            console.error('Error handling answer', e);
          }
        });

        newSocket.on('ice-candidate', async ({ candidate, from }) => {
          const pcRef = peers.get(from);
          if (!pcRef) return;
          if (pcRef.peerConnection.remoteDescription && pcRef.peerConnection.remoteDescription.type) {
            try {
              await pcRef.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error('Error adding ICE candidate', e);
            }
          } else {
            const queue = pendingCandidates.current.get(from) ?? [];
            pendingCandidates.current.set(from, [...queue, candidate]);
          }
        });

        newSocket.on('user-left', ({ socketId }) => {
          const pcRef = peers.get(socketId);
          if (pcRef) {
            pcRef.peerConnection.close();
            peers.delete(socketId);
            setPeers(new Map(peers));
          }
          remotePeers.delete(socketId);
          setRemotePeers(new Map(remotePeers));
        });

        newSocket.on('toggle-video', ({ socketId, enabled }) => {
          updateRemotePeer(socketId, { videoEnabled: enabled });
        });

        newSocket.on('toggle-audio', ({ socketId, enabled }) => {
          updateRemotePeer(socketId, { audioEnabled: enabled });
        });
      } catch (err) {
        alert('Could not access camera and/or microphone.');
      }
    }

    start();

    return () => {
      mounted = false;
      if (localStream) localStream.getTracks().forEach((track) => track.stop());
      if (socket) {
        socket.emit('leave-room', { roomName });
        socket.disconnect();
      }
      peers.forEach(({ peerConnection }) => peerConnection.close());
    };
  }, [user, roomName]);

  async function createPeer(
    socketId: string,
    isInitiator: boolean,
    stream: MediaStream,
    socketInstance: Socket
  ) {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketInstance.emit('ice-candidate', { candidate: event.candidate, to: socketId });
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      updateRemotePeer(socketId, { stream: remoteStream });
    };

    peers.set(socketId, { peerConnection, stream: null });
    setPeers(new Map(peers));

    if (isInitiator) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketInstance.emit('offer', { offer, to: socketId });
    }

    return peerConnection;
  }

  async function handleOffer(
    offer: RTCSessionDescriptionInit,
    from: string,
    stream: MediaStream,
    socketInstance: Socket
  ) {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketInstance.emit('ice-candidate', { candidate: event.candidate, to: from });
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      updateRemotePeer(from, { stream: remoteStream });
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await flushCandidates(peerConnection, from);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socketInstance.emit('answer', { answer, to: from });

    peers.set(from, { peerConnection, stream: null });
    setPeers(new Map(peers));
  }

  function toggleVideo() {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
      socket?.emit('toggle-video', { roomName, enabled: track.enabled });
    }
  }

  function toggleAudio() {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
      socket?.emit('toggle-audio', { roomName, enabled: track.enabled });
    }
  }

  async function shareScreen() {
    if (!localStream) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getTracks()[0];

      peers.forEach(({ peerConnection }) => {
        const sender = peerConnection.getSenders().find((s) => s.track?.kind === screenTrack.kind);
        if (sender) sender.replaceTrack(screenTrack);
      });

      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

      screenTrack.onended = () => stopScreenShare();

      setIsScreenSharing(true);
    } catch {
      /* User cancelled or failed */
    }
  }

  function stopScreenShare() {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];

    peers.forEach(({ peerConnection }) => {
      const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
    });

    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

    setIsScreenSharing(false);
  }

  function leaveCall() {
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    socket?.emit('leave-room', { roomName });
    socket?.disconnect();
    peers.forEach(({ peerConnection }) => peerConnection.close());
    onLeave();
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-grow p-4">
        <div
          className={`grid gap-4 ${
            remotePeers.size === 0
              ? 'grid-cols-1'
              : remotePeers.size === 1
              ? 'grid-cols-2'
              : remotePeers.size <= 4
              ? 'grid-cols-3'
              : 'grid-cols-4'
          } h-full`}
        >
          {/* Local video */}
          <Card className="relative overflow-hidden">
            <video ref={localVideoRef} muted autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2">
              <Badge>{userName}</Badge>
            </div>
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <VideoOff className="text-red-600 w-12 h-12" />
              </div>
            )}
          </Card>

          {/* Remote videos */}
          {Array.from(remotePeers.values()).map((rp) => (
            <Card key={rp.socketId} className="relative overflow-hidden">
              <video
                autoPlay
                playsInline
                ref={(video) => {
                  if (video && rp.stream) {
                    video.srcObject = rp.stream;
                  }
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2">
                <Badge>{rp.userName}</Badge>
              </div>
              {!rp.videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <VideoOff className="text-red-600 w-12 h-12" />
                </div>
              )}
              {!rp.audioEnabled && (
                <div className="absolute top-1 right-1">
                  <MicOff className="text-red-600 w-5 h-5" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-600 bg-gray-900 p-4 flex justify-center space-x-6">
        <Button onClick={toggleAudio} variant={audioEnabled ? undefined : 'destructive'} size="lg" aria-label="Toggle Microphone">
          {audioEnabled ? <Mic /> : <MicOff />}
        </Button>
        <Button onClick={toggleVideo} variant={videoEnabled ? undefined : 'destructive'} size="lg" aria-label="Toggle Camera">
          {videoEnabled ? <Video /> : <VideoOff />}
        </Button>
        <Button onClick={isScreenSharing ? stopScreenShare : shareScreen} variant={isScreenSharing ? 'default' : 'outline'} size="lg" aria-label="Toggle Screen Share">
          <Monitor />
        </Button>
        <Button onClick={leaveCall} variant="destructive" size="lg" aria-label="Leave Call">
          <PhoneOff />
        </Button>
      </div>
    </div>
  );
}
