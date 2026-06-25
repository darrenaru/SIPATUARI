import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import DashboardLayout from './components/layout/DashboardLayout';
import RoleGate from './components/auth/RoleGate';
import RequireAuth from './components/auth/RequireAuth';
import { AuthProvider } from './contexts/AuthContext';
import { ROLES } from './constants/roles';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Armada from './pages/Armada';
import ManajemenTrayek from './pages/ManajemenTrayek';
import RealisasiVoyage from './pages/RealisasiVoyage';
import DataPenumpang from './pages/DataPenumpang';
import DataBongkarMuat from './pages/DataBongkarMuat';
import FasilitasPelabuhan from './pages/FasilitasPelabuhan';
import FasilitasPelabuhanForm from './pages/FasilitasPelabuhanForm';
import KondisiEkonomi from './pages/KondisiEkonomi';
import UsulanTrayek from './pages/UsulanTrayek';
import ManajemenPengguna from './pages/ManajemenPengguna';
import Laporan from './pages/Laporan';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="armada" element={<RoleGate allow={[ROLES.ADMIN, ROLES.OPERATOR]}><Armada /></RoleGate>} />
            <Route path="trayek" element={<ManajemenTrayek />} />
            <Route path="voyage" element={<RoleGate allow={[ROLES.ADMIN, ROLES.OPERATOR]}><RealisasiVoyage /></RoleGate>} />
            <Route path="penumpang" element={<RoleGate allow={[ROLES.ADMIN, ROLES.OPERATOR]}><DataPenumpang /></RoleGate>} />
            <Route path="bongkar-muat" element={<RoleGate allow={[ROLES.ADMIN, ROLES.OPERATOR]}><DataBongkarMuat /></RoleGate>} />
            <Route path="fasilitas-pelabuhan" element={<RoleGate allow={[ROLES.ADMIN, ROLES.UPP]}><FasilitasPelabuhan /></RoleGate>} />
            <Route path="fasilitas-pelabuhan/:id" element={<RoleGate allow={[ROLES.ADMIN, ROLES.UPP]}><FasilitasPelabuhanForm /></RoleGate>} />
            <Route path="kondisi-ekonomi" element={<RoleGate allow={[ROLES.ADMIN, ROLES.PEMKAB]}><KondisiEkonomi /></RoleGate>} />
            <Route path="usulan-trayek" element={<RoleGate allow={[ROLES.ADMIN, ROLES.PEMKAB]}><UsulanTrayek /></RoleGate>} />
            <Route path="pengguna" element={<RoleGate allow={[ROLES.ADMIN]}><ManajemenPengguna /></RoleGate>} />
            <Route path="laporan" element={<Laporan />} />
          </Route>
        </Routes>
      </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
