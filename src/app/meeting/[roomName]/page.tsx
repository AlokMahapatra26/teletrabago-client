'use client';

import { useParams, useRouter } from 'next/navigation';
import { VideoCallRoom } from '@/components/meetings/VideoCallRoom';

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomName = params.roomName as string;

  console.log('Meeting Room Page loaded');
  console.log('Room Name:', roomName);

  const handleLeave = () => {
    router.push('/dashboard');
  };

  if (!roomName) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Meeting Room</h1>
          <button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <VideoCallRoom roomName={roomName} onLeave={handleLeave} />;
}
