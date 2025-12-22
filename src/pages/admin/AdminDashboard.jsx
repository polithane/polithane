import { useState } from 'react';
import { Users, FileText, AlertCircle, Settings } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { formatNumber } from '../../utils/formatters';

export const AdminDashboard = () => {
  const [stats] = useState({
    totalUsers: 125000,
    totalPosts: 45000,
    totalInteractions: 1250000,
    pendingApprovals: 23
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Paneli</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Toplam Kullanıcı</p>
                <p className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</p>
              </div>
              <Users className="w-10 h-10 text-primary-blue" />
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Toplam Paylaşım</p>
                <p className="text-2xl font-bold">{formatNumber(stats.totalPosts)}</p>
              </div>
              <FileText className="w-10 h-10 text-primary-green" />
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Toplam Etkileşim</p>
                <p className="text-2xl font-bold">{formatNumber(stats.totalInteractions)}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-500" />
            </div>
          </Card>
          
          <Card className="border-red-300 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Onay Bekleyen</p>
                <p className="text-2xl font-bold text-red-600">{stats.pendingApprovals}</p>
              </div>
              <Settings className="w-10 h-10 text-red-600" />
            </div>
          </Card>
        </div>
        
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Yönetim Paneli</h2>
          <p className="text-gray-600">
            Admin paneli özellikleri yakında eklenecektir.
          </p>
        </div>
      </div>
    </div>
  );
};
