import { Routes, BrowserRouter, Route } from "react-router-dom";
import { EnhancedHealthDashboard } from "./containers";
import { Layout } from "./components";
import { GlobalAuthModalProvider } from "./contexts/GlobalAuthModalContext";

function App() {
  return (
    <BrowserRouter basename="">
      <GlobalAuthModalProvider>
        <Layout>
          <Routes>
            <Route path={"/"} element={<EnhancedHealthDashboard />} />
          </Routes>
        </Layout>
      </GlobalAuthModalProvider>
    </BrowserRouter>
  );
}

export default App;
