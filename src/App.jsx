import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ActionBar } from './components/layout/ActionBar';
import { FollowSuggestionsBar } from './components/layout/FollowSuggestionsBar';
import { WelcomePopup } from './components/common/WelcomePopup';
import { ActivationReminderModal } from './components/common/ActivationReminderModal';
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
import { CategoryFeedPage } from './pages/CategoryFeedPage';
import { NoAgendaFeedPage } from './pages/NoAgendaFeedPage';
import { HitFeedPage } from './pages/HitFeedPage';
import { FastPage } from './pages/FastPage';
import { FastViewerPage } from './pages/FastViewerPage';

// Auth Pages
import { LoginPageNew } from './pages/auth/LoginPageNew';
import { RegisterPageNew } from './pages/auth/RegisterPageNew';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

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
import { MailTest } from './pages/admin/MailTest';
import { NotificationRules } from './pages/admin/NotificationRules';
import { ScrapingManagement } from './pages/admin/ScrapingManagement';
import { SourceManagement } from './pages/admin/SourceManagement';
import { PaymentsAndRevenue } from './pages/admin/PaymentsAndRevenue';
import { SecuritySettings } from './pages/admin/SecuritySettings';
import { DatabaseManagement } from './pages/admin/DatabaseManagement';
import { APISettings } from './pages/admin/APISettings';
import { SystemTransformation } from './pages/admin/SystemTransformation';
import { JobQueue } from './pages/admin/JobQueue';
import { PartyManagement } from './pages/admin/PartyManagement';
import { AgendaManagement } from './pages/admin/AgendaManagement';
import { ParliamentManagement } from './pages/admin/ParliamentManagement';
import { DeleteConfirmPage } from './pages/DeleteConfirmPage';
import { AboutPage } from './pages/AboutPage';
import { MissionPage } from './pages/MissionPage';
import { ContactPage } from './pages/ContactPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';
import { ParliamentInfoPage } from './pages/ParliamentInfoPage';
import { PartiesDirectoryPage } from './pages/PartiesDirectoryPage';
import { SiteHeadManager } from './components/system/SiteHeadManager';
import { ScrollToTop } from './components/system/ScrollToTop';
import { MaintenancePage } from './pages/MaintenancePage';
import { usePublicSite } from './contexts/PublicSiteContext';
import { useAuth } from './contexts/AuthContext';

function App() {
  const location = useLocation();
  const { maintenanceMode } = usePublicSite();
  const { isAdmin, user, emailVerified, requiresEmailVerification } = useAuth();
  
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);

  // Show welcome popup for new users (only once)
  useEffect(() => {
    if (!user) {
      setShowWelcomePopup(false);
      setShowActivationModal(false);
      return;
    }
    
    const hasSeenWelcome = sessionStorage.getItem('polithane_welcome_shown');
    if (!hasSeenWelcome) {
      setShowWelcomePopup(true);
      sessionStorage.setItem('polithane_welcome_shown', 'true');
    }
  }, [user]);

  // Show activation reminder if email not verified
  useEffect(() => {
    if (!user || !requiresEmailVerification) return;
    if (emailVerified) return;
    
    // Show after welcome popup closes
    const timer = setTimeout(() => {
      setShowActivationModal(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [user, emailVerified, requiresEmailVerification]);

  const path = String(location?.pathname || '/');
  const isAuthRoute =
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/verify-email');
  const isAdminRoute = path.startsWith('/adminyonetim');
  const bypass = isAdmin?.() === true || isAdminRoute || isAuthRoute;

  if (maintenanceMode && !bypass) {
    return (
      <div className="min-h-screen flex flex-col app-shell">
        <SiteHeadManager />
        <ScrollToTop />
        <MaintenancePage />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col app-shell">
      <SiteHeadManager />
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <>
              <Header />
              {/* Keep homepage centered; shrink max-width on xl+ via CSS to make room for fixed sidebars */}
              <div className="home-layout">
                <HomePage />
                <Footer />
              </div>
              <ActionBar />
              <FollowSuggestionsBar limit={8} />
            </>
          }
        />
        <Route path="/post/:postId" element={<><Header /><PostDetailPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/profile/:userId" element={<><Header /><ProfilePage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/@:username" element={<><Header /><ProfilePage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/:username" element={<><Header /><ProfilePage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/party/:partyId" element={<><Header /><PartyDetailPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/agenda/:agendaSlug" element={<><Header /><AgendaDetailPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/category/:categoryId" element={<><Header /><CategoryFeedPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/hit" element={<><Header /><HitFeedPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/gundem-disi" element={<><Header /><NoAgendaFeedPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/agendas" element={<><Header /><AgendasPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/city/:cityCode" element={<><Header /><CityDetailPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        {/* Messages is a full-height app surface; no footer (avoids mobile input hiding behind ActionBar) */}
        <Route path="/messages" element={<><Header /><MessagesPage /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/search" element={<><Header /><SearchPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/polit-at" element={<><Header /><CreatePolitPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/test" element={<><Header /><TestPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/polifest" element={<><Header /><PoliFestPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/fast" element={<><Header /><FastPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/fast-at" element={<><Header /><CreatePolitPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/fast/:usernameOrId" element={<FastViewerPage />} />
        <Route path="/polifest/:usernameOrId" element={<PoliFestViewerPage />} />
        <Route path="/delete-confirm" element={<DeleteConfirmPage />} />
        <Route path="/about" element={<><Header /><AboutPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/mission" element={<><Header /><MissionPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/contact" element={<><Header /><ContactPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/parliament" element={<><Header /><ParliamentInfoPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/parties" element={<><Header /><PartiesDirectoryPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/terms" element={<><Header /><TermsPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/privacy-policy" element={<><Header /><PrivacyPolicyPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/cookie-policy" element={<><Header /><CookiePolicyPage /><Footer /><ActionBar /><FollowSuggestionsBar limit={8} /></>} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        {/* Backward-compatible legacy routes */}
        <Route path="/stories" element={<><Header /><PoliFestPage /><Footer /><ActionBar /></>} />
        <Route path="/stories/:usernameOrId" element={<PoliFestViewerPage />} />
        
        {/* Auth Routes (No Header/Footer) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login-new" element={<LoginPageNew />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-new" element={<RegisterPageNew />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        
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
        <Route path="/adminyonetim" element={<AdminLayout />}>
          <Route index element={<AdminDashboardNew />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="parties" element={<PartyManagement />} />
          <Route path="parliament" element={<ParliamentManagement />} />
          <Route path="agendas" element={<AgendaManagement />} />
          <Route path="posts" element={<PostModeration />} />
          <Route path="comments" element={<CommentModeration />} />
          <Route path="media" element={<MediaManagement />} />
          <Route path="algorithm" element={<AlgorithmSettings />} />
          <Route path="site-settings" element={<SiteSettings />} />
          <Route path="theme" element={<ThemeEditor />} />
          <Route path="seo" element={<SEOSettings />} />
          <Route path="email" element={<EmailTemplates />} />
          <Route path="mail-settings" element={<MailTest />} />
          {/* Backward compatible */}
          <Route path="email-test" element={<MailTest />} />
          <Route path="notifications" element={<NotificationRules />} />
          <Route path="automation" element={<AutomationControl />} />
          <Route path="scraping" element={<ScrapingManagement />} />
          <Route path="sources" element={<SourceManagement />} />
          <Route path="ads" element={<AdsManagement />} />
          <Route path="payments" element={<PaymentsAndRevenue />} />
          <Route path="revenue" element={<PaymentsAndRevenue />} />
          <Route path="security" element={<SecuritySettings />} />
          <Route path="database" element={<DatabaseManagement />} />
          <Route path="api" element={<APISettings />} />
          <Route path="system" element={<SystemTransformation />} />
          <Route path="jobs" element={<JobQueue />} />
        </Route>
      </Routes>
      
      {/* Welcome Popup (First login) */}
      <WelcomePopup
        isOpen={showWelcomePopup}
        onClose={() => setShowWelcomePopup(false)}
        userName={user?.full_name}
      />

      {/* Activation Reminder Modal */}
      <ActivationReminderModal
        isOpen={showActivationModal}
        onClose={() => setShowActivationModal(false)}
      />
      
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
