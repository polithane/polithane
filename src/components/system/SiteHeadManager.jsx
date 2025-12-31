import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiCall } from '../../utils/api';

const upsertMeta = (nameOrProp, value, attr = 'name') => {
  if (!value) return;
  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;
  const selector = `meta[${attr}="${nameOrProp}"]`;
  let el = head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    head.appendChild(el);
  }
  el.setAttribute('content', String(value));
};

const upsertLink = (rel, href) => {
  if (!href) return;
  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;
  const selector = `link[rel="${rel}"]`;
  let el = head.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    head.appendChild(el);
  }
  el.setAttribute('href', String(href));
};

const extractGaId = (input) => {
  const s = String(input || '').trim();
  if (!s) return '';
  const m = s.match(/G-[A-Z0-9]+/i);
  return m ? m[0].toUpperCase() : '';
};

const ensureGtag = (gaId) => {
  if (!gaId) return false;
  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return false;

  const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  const existing = head.querySelector(`script[src="${src}"]`);
  if (!existing) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    head.appendChild(s);
  }

  if (!window.dataLayer) window.dataLayer = [];
  // eslint-disable-next-line no-underscore-dangle
  if (!window.__polithane_gtag_initialized) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: false });
    // eslint-disable-next-line no-underscore-dangle
    window.__polithane_gtag_initialized = true;
  }
  return true;
};

const injectHtmlOnce = (target, html, markerId) => {
  const doc = document;
  if (!target || !doc) return;
  const raw = String(html || '').trim();
  // Remove existing injected nodes
  const existing = doc.querySelectorAll(`[data-polithane-inject="${markerId}"]`);
  existing.forEach((n) => n?.parentNode?.removeChild?.(n));
  if (!raw) return;

  const tpl = doc.createElement('template');
  tpl.innerHTML = raw;
  const nodes = Array.from(tpl.content.childNodes || []);
  for (const node of nodes) {
    try {
      if (node && node.setAttribute) node.setAttribute('data-polithane-inject', markerId);
    } catch {
      // ignore
    }
    target.appendChild(node);
  }
};

export const SiteHeadManager = () => {
  const [gaId, setGaId] = useState('');
  const fetchedRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const r = await apiCall('/api/public/site', { method: 'GET' });
        const seo = r?.success ? r?.data?.seo : null;
        if (seo && typeof seo === 'object') {
          const title = String(seo.metaTitle || '').trim();
          const desc = String(seo.metaDescription || '').trim();
          const keywords = String(seo.metaKeywords || '').trim();
          const robots = String(seo.robots || '').trim();
          const canonical = String(seo.canonicalURL || '').trim();
          const ogTitle = String(seo.ogTitle || title || '').trim();
          const ogDesc = String(seo.ogDescription || desc || '').trim();
          const ogImage = String(seo.ogImage || '').trim();
          const twCard = String(seo.twitterCard || '').trim();
          const twSite = String(seo.twitterSite || '').trim();
          const favicon = String(seo.favicon || '').trim();
          const headHtml = String(seo.headHtml || '').trim();
          const bodyHtml = String(seo.bodyHtml || '').trim();

          if (title) document.title = title;
          if (desc) upsertMeta('description', desc, 'name');
          if (keywords) upsertMeta('keywords', keywords, 'name');
          if (robots) upsertMeta('robots', robots, 'name');
          if (canonical) upsertLink('canonical', canonical);
          if (favicon) upsertLink('icon', favicon);

          if (ogTitle) upsertMeta('og:title', ogTitle, 'property');
          if (ogDesc) upsertMeta('og:description', ogDesc, 'property');
          if (ogImage) upsertMeta('og:image', ogImage, 'property');
          if (canonical) upsertMeta('og:url', canonical, 'property');

          if (twCard) upsertMeta('twitter:card', twCard, 'name');
          if (twSite) upsertMeta('twitter:site', twSite, 'name');

          // Custom injections (admin-controlled)
          injectHtmlOnce(document.head, headHtml, 'head');
          injectHtmlOnce(document.body, bodyHtml, 'body');

          const id = extractGaId(seo.googleAnalyticsID);
          if (id) setGaId(id);
        }
      } catch {
        // best-effort
      }
    })();
  }, []);

  useEffect(() => {
    if (!gaId) return;
    if (!ensureGtag(gaId)) return;
    const path = `${location.pathname}${location.search || ''}${location.hash || ''}`;
    try {
      window.gtag?.('event', 'page_view', { page_path: path });
    } catch {
      // ignore
    }
  }, [gaId, location.pathname, location.search, location.hash]);

  return null;
};

