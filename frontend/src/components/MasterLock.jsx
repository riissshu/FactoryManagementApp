import { useState } from "react";
import api from "../services/api";

export default function MasterLock({ onClose, onUnlock } = {}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const unlock = async () => {
    const valid = await api.verifyMasterPassword(password);

    if (valid) {
      setPassword("");
      setError("");
      onUnlock?.();
    } else {
      setError("That password is not correct.");
    }
  };

  return (
    <>
      {/* Background overlay */}
      <div className="master-lock-overlay">

        {/* Your original lock card */}
        <div className="lock-card">

          <i className="bi bi-shield-lock"></i>

          <h2>Restricted Access</h2>

          <p>Login to edit profile & settings</p>

          <input
            type="password"
            className="form-control"
            placeholder="password"
            value={password}
            autoFocus
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            onKeyDown={(event) =>
              event.key === "Enter" && unlock()
            }
          />

          {error && (
            <small className="text-danger">
              {error}
            </small>
          )}

          <button
            className="btn btn-primary"
            onClick={unlock}
          >
            Login
          </button>

          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>

        </div>
      </div>
    </>
  );
}