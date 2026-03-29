import React, { useState } from "react";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { api } from "./lib/apiClient";
import { useQuizStream } from "./lib/useQuizStream";

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const data = await api.json(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      login(data.accessToken, data.refreshToken);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2>{isRegister ? "Register" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">{isRegister ? "Register" : "Login"}</button>
      </form>
      <button onClick={() => setIsRegister(!isRegister)}>
        Toggle to {isRegister ? "Login" : "Register"}
      </button>
    </div>
  );
}

function Dashboard({ onStartSession }: { onStartSession: (id: string) => void }) {
  const { logout } = useAuth();
  const [topic, setTopic] = useState("");

  const handleStart = async () => {
    try {
      const session = await api.json("/sessions", {
        method: "POST",
        body: JSON.stringify({ topic })
      });
      const round = await api.json(`/sessions/${session.id}/rounds`, {
        method: "POST",
        body: JSON.stringify({ count: 5 })
      });
      onStartSession(session.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <button onClick={logout}>Logout</button>
      <div>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic" />
        <button onClick={handleStart}>Start Quiz</button>
      </div>
    </div>
  );
}

function QuizRunner({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const { questions, status, error } = useQuizStream(sessionId);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const handleAttempt = async (qId: string, option: string) => {
    try {
      const result = await api.json(`/sessions/${sessionId}/questions/${qId}/attempt`, {
        method: "POST",
        body: JSON.stringify({
          attemptId: `${sessionId}-${qId}-${Date.now()}`,
          selectedOption: option
        })
      });
      setAnswers(prev => ({ ...prev, [qId]: result.feedback }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <button onClick={onBack}>Back to Dashboard</button>
      <h2>Quiz</h2>
      {status === "CONNECTING" && <p>Connecting...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      
      {questions.map((q: any) => (
        <div key={q.id} style={{ border: "1px solid #ccc", padding: "10px", margin: "10px 0" }}>
          <p>{q.questionText}</p>
          {Object.entries(q.options).map(([k, v]) => (
            <button 
              key={k} 
              onClick={() => handleAttempt(q.id, k)}
              disabled={!!answers[q.id]}
            >
              {k}: {v as string}
            </button>
          ))}
          {answers[q.id] && (
            <div>
              <p>{answers[q.id].isCorrect ? "✅ Correct!" : "❌ Incorrect"}</p>
              <p>Explanation: {answers[q.id].explanation}</p>
            </div>
          )}
        </div>
      ))}
      
      {status === "DONE" && <p>Round Complete!</p>}
    </div>
  );
}

function Main() {
  const { isAuthenticated } = useAuth();
  const [activeSession, setActiveSession] = useState<string | null>(null);

  if (!isAuthenticated) return <Login />;

  if (activeSession) {
    return <QuizRunner sessionId={activeSession} onBack={() => setActiveSession(null)} />;
  }

  return <Dashboard onStartSession={setActiveSession} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}
