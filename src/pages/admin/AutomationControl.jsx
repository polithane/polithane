import { useState } from 'react';
import { Bot, Play, Pause, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export const AutomationControl = () => {
  const [workflows, setWorkflows] = useState([
    { id: 1, name: 'Twitter Tarayıcı', status: 'running', lastRun: '5 dakika önce', success: 145, failed: 2 },
    { id: 2, name: 'Instagram Tarayıcı', status: 'running', lastRun: '12 dakika önce', success: 89, failed: 0 },
    { id: 3, name: 'RSS Okuyucu', status: 'paused', lastRun: '1 saat önce', success: 234, failed: 5 },
    { id: 4, name: 'Paylaşım Zamanlayıcı', status: 'running', lastRun: '2 dakika önce', success: 567, failed: 1 },
  ]);

  const handleToggleWorkflow = (id) => {
    setWorkflows(prev => prev.map(w => 
      w.id === id ? { ...w, status: w.status === 'running' ? 'paused' : 'running' } : w
    ));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Otomasyon Kontrolü</h1>
        <p className="text-gray-600">n8n workflow'larını yönetin</p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
          <div className="text-2xl font-black text-gray-900">1,035</div>
          <div className="text-sm text-gray-600">Başarılı İşlem</div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <div className="text-2xl font-black text-gray-900">8</div>
          <div className="text-sm text-gray-600">Başarısız İşlem</div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Bot className="w-8 h-8 text-blue-500 mb-2" />
          <div className="text-2xl font-black text-gray-900">4</div>
          <div className="text-sm text-gray-600">Aktif Workflow</div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <Clock className="w-8 h-8 text-purple-500 mb-2" />
          <div className="text-2xl font-black text-gray-900">2 dk</div>
          <div className="text-sm text-gray-600">Ort. Çalışma Süresi</div>
        </div>
      </div>
      
      {/* Workflows */}
      <div className="bg-white rounded-xl border border-gray-200">
        {workflows.map(workflow => (
          <div key={workflow.id} className="p-6 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${workflow.status === 'running' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Bot className={`w-6 h-6 ${workflow.status === 'running' ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                
                <div>
                  <h3 className="font-bold text-gray-900">{workflow.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${workflow.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {workflow.status === 'running' ? 'Çalışıyor' : 'Duraklatıldı'}
                    </span>
                    <span className="text-xs text-gray-500">Son çalışma: {workflow.lastRun}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Başarılı / Hata</div>
                  <div className="font-bold text-gray-900">{workflow.success} / <span className="text-red-500">{workflow.failed}</span></div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleWorkflow(workflow.id)}
                    className={`p-2 rounded-lg ${workflow.status === 'running' ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                  >
                    {workflow.status === 'running' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  
                  <button className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
