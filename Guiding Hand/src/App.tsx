import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Projects from "./pages/Projects";
import Stakeholders from "./pages/Stakeholders";
import ConflictMap from "./pages/ConflictMap";
import Packet from "./pages/Packet";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/stakeholders" element={<Stakeholders />} />
            <Route path="/conflict-map" element={<ConflictMap />} />
            <Route path="/packet" element={<Packet />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
