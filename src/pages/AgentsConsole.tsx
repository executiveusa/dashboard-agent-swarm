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
