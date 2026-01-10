// Utility for optimized post icons from Supabase storage
// For text and audio posts, we use pre-generated icons in different sizes

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nkwgnulilfzrzecwccep.supabase.co';

const ICON_SIZES = {
  SMALL: 150,
  MEDIUM: 250,
  LARGE: 400,
};

/**
 * Get the optimal icon URL for text/audio posts based on display size
 * @param {string} contentType - 'text' or 'audio'
 * @param {number} displayWidth - Width in pixels of the display area
 * @returns {string} Optimized icon URL
 */
export const getOptimizedPostIcon = (contentType, displayWidth) => {
  if (contentType !== 'text' && contentType !== 'audio') {
    return null;
  }

  // Determine the best size based on display width
  let iconSize;
  if (displayWidth <= 150) {
    iconSize = ICON_SIZES.SMALL;
  } else if (displayWidth <= 300) {
    iconSize = ICON_SIZES.MEDIUM;
  } else {
    iconSize = ICON_SIZES.LARGE;
  }

  // Construct the URL (using 'metin' for Turkish text, 'ses' for audio)
  const filename = contentType === 'text' ? `${iconSize}x${iconSize}metin.svg` : `${iconSize}x${iconSize}ses.svg`;
  return `${SUPABASE_URL}/storage/v1/object/public/ikons/${filename}`;
};

/**
 * Get all available sizes for a content type (for preloading if needed)
 * @param {string} contentType - 'text' or 'audio'
 * @returns {string[]} Array of URLs
 */
export const getAllIconSizes = (contentType) => {
  if (contentType !== 'text' && contentType !== 'audio') {
    return [];
  }

  const suffix = contentType === 'text' ? 'metin.svg' : 'ses.svg';
  return [
    `${SUPABASE_URL}/storage/v1/object/public/ikons/${ICON_SIZES.SMALL}x${ICON_SIZES.SMALL}${suffix}`,
    `${SUPABASE_URL}/storage/v1/object/public/ikons/${ICON_SIZES.MEDIUM}x${ICON_SIZES.MEDIUM}${suffix}`,
    `${SUPABASE_URL}/storage/v1/object/public/ikons/${ICON_SIZES.LARGE}x${ICON_SIZES.LARGE}${suffix}`,
  ];
};
