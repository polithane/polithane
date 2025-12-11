// Simple Supabase test page
import { useState, useEffect } from 'react';

export default function TestSupabase() {
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    // Check if Supabase env vars exist
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      setStatus('❌ Environment variables missing!');
      return;
    }
    
    setStatus('✅ Supabase configured!');
  }, []);

  return (
    <div style={{ padding: '50px', fontFamily: 'Arial' }}>
      <h1>🧪 Supabase Test</h1>
      <p style={{ fontSize: '24px' }}>{status}</p>
      
      <div style={{ marginTop: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Configuration:</h3>
        <p>URL: {import.meta.env.VITE_SUPABASE_URL || '❌ Missing'}</p>
        <p>Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: 'blue', textDecoration: 'underline' }}>← Back to Home</a>
      </div>
    </div>
  );
}
