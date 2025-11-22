import { Routes, BrowserRouter, Route, Navigate } from "react-router-dom";
import { Layout, AuthGuard, Breadcrumbs } from "./components";
import { GlobalAuthModalProvider } from "./contexts/GlobalAuthModalContext";
import {
  Dashboard,
  CreateProject,
  ProjectDetail,
  RealtimeView,
  CustomEvents,
  ProjectSettings,
  ApiKeys,
  NotFound
} from "./pages";

function App() {
  return (
    <BrowserRouter basename="">
      <GlobalAuthModalProvider>
        <Layout
          appName="Analytics Pulse"
          appDescription="Real-time analytics platform"
          showNavigation={true}
        >
          <Breadcrumbs />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Dashboard />} />

            {/* Protected Project Routes */}
            <Route
              path="/projects/new"
              element={
                <AuthGuard>
                  <CreateProject />
                </AuthGuard>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <AuthGuard>
                  <ProjectDetail />
                </AuthGuard>
              }
            />
            <Route
              path="/projects/:id/realtime"
              element={
                <AuthGuard>
                  <RealtimeView />
                </AuthGuard>
              }
            />
            <Route
              path="/projects/:id/events"
              element={
                <AuthGuard>
                  <CustomEvents />
                </AuthGuard>
              }
            />
            <Route
              path="/projects/:id/settings"
              element={
                <AuthGuard>
                  <ProjectSettings />
                </AuthGuard>
              }
            />
            <Route
              path="/projects/:id/api-keys"
              element={
                <AuthGuard>
                  <ApiKeys />
                </AuthGuard>
              }
            />

            {/* Fallback Routes */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Layout>
      </GlobalAuthModalProvider>
    </BrowserRouter>
  );
}

export default App;
