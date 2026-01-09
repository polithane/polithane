import express from 'express';
import { getSetting, getSettings } from '../utils/settingsService.js';

const router = express.Router();

// ============================================
// GET PUBLIC SITE SETTINGS
// ============================================
router.get('/site', async (req, res) => {
  try {
    const settings = await getSettings();
    
    // Convert to a flat object for frontend
    const flatSettings = Object.entries(settings).reduce((acc, [key, val]) => {
      acc[key] = val.value;
      return acc;
    }, {});

    // Return only public settings
    res.json({
      success: true,
      data: {
        siteName: flatSettings.site_name || 'Polithane.',
        siteSlogan: flatSettings.site_slogan || 'Özgür, açık, şeffaf siyaset!',
        maintenanceMode: flatSettings.maintenance_mode === 'true' || flatSettings.maintenance_mode === true,
        allowRegistration: flatSettings.allow_registration !== 'false' && flatSettings.allow_registration !== false,
        allowComments: flatSettings.allow_comments !== 'false' && flatSettings.allow_comments !== false,
        allowMessages: flatSettings.allow_messages !== 'false' && flatSettings.allow_messages !== false,
        gridSettings: flatSettings.grid_settings || {
          home_desktop: 5,
          home_mobile: 2,
          profile_desktop: 5,
          profile_mobile: 2,
          city_desktop: 5,
          city_mobile: 2,
          agenda_desktop: 5,
          agenda_mobile: 2,
          category_desktop: 5,
          category_mobile: 2,
        },
      }
    });
  } catch (error) {
    console.error('Get public site settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Site ayarları yüklenemedi'
    });
  }
});

export default router;
