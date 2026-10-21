import { Suspense } from "react";

import { LoadingState } from "@/components/feedback/loading-state";
import { RoomPage } from "@/features/race/room-page";

type RoomRouteProps = {
  params: Promise<{ code: string }>;
};

export default function Page({ params }: RoomRouteProps) {
  return (
    <Suspense fallback={<LoadingState label="Joining the room" />}>
      <RoomRoute params={params} />
    </Suspense>
  );
}

async function RoomRoute({ params }: RoomRouteProps) {
  const { code } = await params;
  return <RoomPage code={code} />;
}
