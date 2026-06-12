import { createContext, useContext } from "react";
import { Routes, Route } from "react-router-dom";
import { TopNav } from "./components/ui";
import { useTasks } from "./hooks/useTasks";
import Generate from "./screens/Generate";
import Library from "./screens/Library";
import Settings from "./screens/Settings";

type TasksCtx = ReturnType<typeof useTasks>;
const Ctx = createContext<TasksCtx | null>(null);

export function useTasksCtx() {
  const c = useContext(Ctx);
  if (!c) throw new Error("TasksCtx missing");
  return c;
}

export default function App() {
  const tasks = useTasks();
  return (
    <Ctx.Provider value={tasks}>
      <div className="app">
        <TopNav />
        <Routes>
          <Route path="/" element={<Generate />} />
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Ctx.Provider>
  );
}
