import React from 'react';
import KingModeChessboard from '../../components/KingModeChessboard';

export default function KingMode() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          King Mode Command Center
        </h1>
        <p className="text-muted-foreground">
          3D VR-ready visualization of the 32-agent swarm working towards the $100M goal.
        </p>
      </div>
      <div className="flex-1 w-full rounded-xl overflow-hidden border border-border">
        <KingModeChessboard />
      </div>
    </div>
  );
}
