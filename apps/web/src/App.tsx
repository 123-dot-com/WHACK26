import { useConnection } from "./hooks/useConnection";

export function App() {
  const status = useConnection();
  const labels = {
    connecting: "Connecting...",
    connected: "Connected",
    unavailable: "Connection unavailable",
  };

  return (
    <main>
      <p className="eyebrow">A day in the life of a finance bro</p>
      <h1>BULLISH!</h1>
      <p className="tagline">Read the news. Make your move. Learn what happens.</p>
      <p>Your first trading day is taking shape.</p>
      <p className={`connection ${status}`} role="status">{labels[status]}</p>
    </main>
  );
}
