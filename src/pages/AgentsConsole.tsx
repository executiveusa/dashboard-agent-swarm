const AgentsConsole = () => {
  return (
    <div className="h-[calc(100vh-6rem)]">
      <iframe
        title="Flowise Agents"
        src="/agents/"
        className="h-full w-full border-0"
        allow="clipboard-write"
      />
    </div>
  );
};

export default AgentsConsole;
