import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { MyProjects } from "./pages/MyProjects";
import { Community } from "./pages/Community";
import { Collections } from "./pages/Collections";
import { ProjectDetail } from "./pages/ProjectDetail";
import { NewProject } from "./pages/NewProject";
import { Library } from "./pages/Library";

export const App: React.FC = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/my-projects" replace />} />
        <Route path="/my-projects" element={<MyProjects />} />
        <Route path="/library" element={<Library />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:collectionId" element={<Collections />} />
        <Route path="/community" element={<Community />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/new" element={<NewProject />} />
      </Routes>
    </AppShell>
  );
};
