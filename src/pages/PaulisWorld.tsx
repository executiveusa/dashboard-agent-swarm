import React from 'react';
import YappyverseScene from '../../components/YappyverseScene';

export default function PaulisWorld() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#cc1122] to-[#ffaa44]">
          Pauli's World
        </h1>
        <p className="text-[#b0a080]">
          The Yappyverse — immersive 3D view of agents in Las Vegas 2056. Cinematic anime noir. Sepia + red.
        </p>
      </div>
      <div className="flex-1 w-full rounded-xl overflow-hidden border border-[#cc1122]/20">
        <YappyverseScene />
      </div>
    </div>
  );
}
