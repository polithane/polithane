import express from 'express';
import { sql } from '../index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { getSettings, updateSettings, getSetting } from '../utils/settingsService.js';

const router = express.Router();

// ============================================
// GET ALL SETTINGS (Admin only)
// ============================================
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await getSettings();
    
    // Convert to a flat object for frontend
    const flatSettings = Object.entries(settings).reduce((acc, [key, val]) => {
      acc[key] = val.value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: flatSettings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Ayarlar yüklenemedi'
    });
  }
});

// ============================================
// UPDATE SETTINGS (Admin only)
// ============================================
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settingsToUpdate = req.body;

    // Update all provided settings
    await updateSettings(settingsToUpdate);

    res.json({
      success: true,
      message: 'Ayarlar başarıyla kaydedildi'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Ayarlar kaydedilemedi'
    });
  }
});

// ============================================
// GET SPECIFIC SETTING (Public)
// ============================================
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await getSetting(key);

    if (value === null) {
      return res.status(404).json({
        success: false,
        error: 'Ayar bulunamadı'
      });
    }

    res.json({
      success: true,
      data: { key, value }
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      error: 'Ayar yüklenemedi'
    });
  }
});

export default router;
