"use client";
import { useEffect, useState } from "react";

export const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("show-toast", { detail: message }));
};

export default function Toast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setMessage(customEvent.detail);
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setVisible(false);
      }, 2200);
    };

    window.addEventListener("show-toast", handleToast);
    return () => {
      window.removeEventListener("show-toast", handleToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className={`toast ${visible ? "visible" : ""}`} id="toast">
      {message}
    </div>
  );
}
