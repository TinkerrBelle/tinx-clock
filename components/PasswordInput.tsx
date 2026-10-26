"use client";
import { useState } from "react";
import Icon from "./Icon";

export default function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input {...props} type={show ? "text" : "password"} />
      <button type="button" className="eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
        <Icon name={show ? "eyeoff" : "eye"} />
      </button>
    </div>
  );
}
