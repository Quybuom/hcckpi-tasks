import { LoginForm } from "../LoginForm";

export default function LoginFormExample() {
  const handleLogin = (username: string, password: string) => {
    console.log("Login successful:", username);
  };

  return <LoginForm onLogin={handleLogin} />;
}
