import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { FloatingChat } from './components/common/FloatingChat';
import { HomePage } from './pages/HomePage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { PartyDetailPage } from './pages/PartyDetailPage';
import { AgendaDetailPage } from './pages/AgendaDetailPage';
import { AgendasPage } from './pages/AgendasPage';
import { CityDetailPage } from './pages/CityDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MessagesPage } from './pages/MessagesPage';
import { SearchPage } from './pages/SearchPage';
import { CreatePolitPage } from './pages/CreatePolitPage';
import { TestPage } from './pages/TestPage';
import { PoliFestPage } from './pages/PoliFestPage';
import { PoliFestViewerPage } from './pages/PoliFestViewerPage';

// Auth Pages
import { LoginPageNew } from './pages/auth/LoginPageNew';
import { RegisterPageNew } from './pages/auth/RegisterPageNew';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Settings Pages
import { SettingsLayout } from './pages/settings/SettingsLayout';
import { ProfileSettings } from './pages/settings/ProfileSettings';
import { AccountSettings } from './pages/settings/AccountSettings';
import { SecuritySettings as UserSecuritySettings } from './pages/settings/SecuritySettings';
import { NotificationSettings } from './pages/settings/NotificationSettings';
import { PrivacySettings } from './pages/settings/PrivacySettings';
import { AppearanceSettings } from './pages/settings/AppearanceSettings';
import { BlockedUsersPage } from './pages/settings/BlockedUsersPage';
import { DeleteAccountPage } from './pages/settings/DeleteAccountPage';

// Admin Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardNew } from './pages/admin/AdminDashboardNew';
import { AlgorithmSettings } from './pages/admin/AlgorithmSettings';
import { UserManagement } from './pages/admin/UserManagement';
import { PostModeration } from './pages/admin/PostModeration';
import { ThemeEditor } from './pages/admin/ThemeEditor';
import { SiteSettings } from './pages/admin/SiteSettings';
import { SEOSettings } from './pages/admin/SEOSettings';
import { AutomationControl } from './pages/admin/AutomationControl';
import { AdsManagement } from './pages/admin/AdsManagement';
import { AnalyticsDashboard } from './pages/admin/AnalyticsDashboard';
import { CommentModeration } from './pages/admin/CommentModeration';
import { MediaManagement } from './pages/admin/MediaManagement';
import { EmailTemplates } from './pages/admin/EmailTemplates';
import { NotificationRules } from './pages/admin/NotificationRules';
import { ScrapingManagement } from './pages/admin/ScrapingManagement';
import { SourceManagement } from './pages/admin/SourceManagement';
import { PaymentSystem } from './pages/admin/PaymentSystem';
import { RevenueAnalysis } from './pages/admin/RevenueAnalysis';
import { SecuritySettings } from './pages/admin/SecuritySettings';
import { DatabaseManagement } from './pages/admin/DatabaseManagement';
import { APISettings } from './pages/admin/APISettings';
import { PartyManagement } from './pages/admin/PartyManagement';
import { DeleteConfirmPage } from './pages/DeleteConfirmPage';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<><Header /><HomePage /><Footer /><FloatingChat /></>} />
        <Route path="/post/:postId" element={<><Header /><PostDetailPage /><Footer /><FloatingChat /></>} />
        <Route path="/profile/:userId" element={<><Header /><ProfilePage /><Footer /><FloatingChat /></>} />
        <Route path="/@:username" element={<><Header /><ProfilePage /><Footer /><FloatingChat /></>} />
        <Route path="/:username" element={<><Header /><ProfilePage /><Footer /><FloatingChat /></>} />
        <Route path="/party/:partyId" element={<><Header /><PartyDetailPage /><Footer /><FloatingChat /></>} />
        <Route path="/agenda/:agendaSlug" element={<><Header /><AgendaDetailPage /><Footer /><FloatingChat /></>} />
        <Route path="/agendas" element={<><Header /><AgendasPage /><Footer /><FloatingChat /></>} />
        <Route path="/city/:cityCode" element={<><Header /><CityDetailPage /><Footer /><FloatingChat /></>} />
        <Route path="/messages" element={<><Header /><MessagesPage /><Footer /><FloatingChat /></>} />
        <Route path="/search" element={<><Header /><SearchPage /><Footer /><FloatingChat /></>} />
        <Route path="/polit-at" element={<><Header /><CreatePolitPage /><Footer /><FloatingChat /></>} />
        <Route path="/test" element={<><Header /><TestPage /><Footer /><FloatingChat /></>} />
        <Route path="/polifest" element={<><Header /><PoliFestPage /><Footer /><FloatingChat /></>} />
        <Route path="/polifest/:usernameOrId" element={<PoliFestViewerPage />} />
        <Route path="/delete-confirm" element={<DeleteConfirmPage />} />
        {/* Backward-compatible legacy routes */}
        <Route path="/stories" element={<><Header /><PoliFestPage /><Footer /><FloatingChat /></>} />
        <Route path="/stories/:usernameOrId" element={<PoliFestViewerPage />} />
        
        {/* Auth Routes (No Header/Footer) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login-new" element={<LoginPageNew />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-new" element={<RegisterPageNew />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Settings Routes */}
        <Route path="/settings" element={<><Header /><SettingsLayout /><Footer /></>}>
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="account" element={<AccountSettings />} />
          <Route path="security" element={<UserSecuritySettings />} />
          <Route path="notifications" element={<NotificationSettings />} />
          <Route path="privacy" element={<PrivacySettings />} />
          <Route path="blocked" element={<BlockedUsersPage />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="delete" element={<DeleteAccountPage />} />
        </Route>
        
        {/* Admin Routes (With Sidebar) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardNew />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="parties" element={<PartyManagement />} />
          <Route path="posts" element={<PostModeration />} />
          <Route path="comments" element={<CommentModeration />} />
          <Route path="media" element={<MediaManagement />} />
          <Route path="algorithm" element={<AlgorithmSettings />} />
          <Route path="site-settings" element={<SiteSettings />} />
          <Route path="theme" element={<ThemeEditor />} />
          <Route path="seo" element={<SEOSettings />} />
          <Route path="email" element={<EmailTemplates />} />
          <Route path="notifications" element={<NotificationRules />} />
          <Route path="automation" element={<AutomationControl />} />
          <Route path="scraping" element={<ScrapingManagement />} />
          <Route path="sources" element={<SourceManagement />} />
          <Route path="ads" element={<AdsManagement />} />
          <Route path="payments" element={<PaymentSystem />} />
          <Route path="revenue" element={<RevenueAnalysis />} />
          <Route path="security" element={<SecuritySettings />} />
          <Route path="database" element={<DatabaseManagement />} />
          <Route path="api" element={<APISettings />} />
        </Route>
      </Routes>
      
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
