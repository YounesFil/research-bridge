import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Search from "./pages/Search.jsx";
import Paper from "./pages/Paper.jsx";
import GraphExplorer from "./pages/GraphExplorer.jsx";
import Bridge from "./pages/Bridge.jsx";
import Collections from "./pages/Collections.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/paper/:id" element={<Paper />} />
        <Route path="/graph" element={<GraphExplorer />} />
        <Route path="/bridge" element={<Bridge />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
