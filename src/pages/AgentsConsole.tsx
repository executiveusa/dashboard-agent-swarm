const AgentsConsole = () => {
  return (
    <div className="h-[calc(100vh-6rem)]">
      <iframe
        title="Flowise Agents"
        src="/agents/"
        className="h-full w-full border-0"
      />
    </div>
  );
};

export default AgentsConsole;
import React from 'react'

// Embed Flowise UI via reverse-proxied path
export default function AgentsConsole() {
  return (
    <div style={{height: '100vh'}}>
      <iframe
        title="Agents"
        src="/agents"
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    </div>
  )
}
