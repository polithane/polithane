// Test page for Supabase connection
import { useState, useEffect } from 'react';
import { supabase, db, storage } from '../lib/supabase';

export default function TestSupabase() {
  const [status, setStatus] = useState('Testing...');
  const [results, setResults] = useState({});

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    const tests = {};

    // Test 1: Database connection
    try {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      tests.database = { status: 'success', message: `Connected! ${count || 0} users in database` };
    } catch (err) {
      tests.database = { status: 'error', message: err.message };
    }

    // Test 2: Storage
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      tests.storage = { status: 'success', message: `${buckets?.length || 0} buckets found` };
    } catch (err) {
      tests.storage = { status: 'error', message: err.message };
    }

    // Test 3: Auth
    try {
      const { data: { session } } = await supabase.auth.getSession();
      tests.auth = { status: 'success', message: session ? 'Logged in' : 'Not logged in (OK)' };
    } catch (err) {
      tests.auth = { status: 'error', message: err.message };
    }

    setResults(tests);
    
    const allSuccess = Object.values(tests).every(t => t.status === 'success');
    setStatus(allSuccess ? '✅ All tests passed!' : '⚠️ Some tests failed');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">🧪 Supabase Connection Test</h1>
          
          <div className="mb-6">
            <p className="text-xl font-semibold">{status}</p>
          </div>

          <div className="space-y-4">
            {Object.entries(results).map(([test, result]) => (
              <div key={test} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold capitalize">{test}</h3>
                  <span className={result.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                    {result.status === 'success' ? '✅' : '❌'}
                  </span>
                </div>
                <p className="text-gray-600 mt-2">{result.message}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">📊 Configuration:</h3>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              URL: {import.meta.env.VITE_SUPABASE_URL || 'Not configured'}
              {'\n'}Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
            </pre>
          </div>

          <div className="mt-6">
            <button
              onClick={testConnection}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Run Tests Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
