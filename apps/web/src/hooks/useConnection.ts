import { useEffect, useState } from "react";
import { getHealth } from "../api/client";

export function useConnection() {
  const [status, setStatus] = useState<"connecting" | "connected" | "unavailable">("connecting");

  useEffect(() => {
    const controller = new AbortController();

    void getHealth(controller.signal)
      .then(() => setStatus("connected"))
      .catch(() => {
        if (!controller.signal.aborted) setStatus("unavailable");
      });

    return () => controller.abort();
  }, []);

  return status;
}
