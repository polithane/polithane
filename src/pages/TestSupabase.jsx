export default function TestSupabase() {
  return (
    <div style={{ 
      padding: '50px', 
      fontFamily: 'Arial',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>🧪 Supabase Test</h1>
      
      <div style={{ 
        fontSize: '24px', 
        padding: '30px', 
        backgroundColor: 'white',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <p><strong>Status:</strong> Page loaded successfully ✅</p>
        <p><strong>React:</strong> Working ✅</p>
      </div>
      
      <div style={{ 
        padding: '30px', 
        backgroundColor: 'white',
        borderRadius: '12px',
        marginBottom: '20px'
      }}>
        <h3>Environment Variables:</h3>
        <p>URL: {import.meta.env.VITE_SUPABASE_URL || '❌ Missing'}</p>
        <p>Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
      </div>
      
      <a 
        href="/" 
        style={{ 
          fontSize: '18px',
          color: '#0070f3',
          textDecoration: 'underline'
        }}
      >
        ← Back to Home
      </a>
    </div>
  );
}
