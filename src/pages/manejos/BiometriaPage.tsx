import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';
import { BiometryTab } from '@/components/BiometryTab';

export default function BiometriaPage() {
  console.log('BiometriaPage component loading...');
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/manejos')}
                className="mb-2 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-primary/10 hover:to-accent/10 border border-slate-200 hover:border-primary/20 text-slate-700 hover:text-primary transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Manejos
              </Button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
                  <Scale className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-primary to-emerald-600 bg-clip-text text-transparent">
                  Biometria
                </h1>
              </div>
              <p className="text-slate-600">
                Registre e acompanhe as medições de peso e crescimento dos camarões
              </p>
            </div>
          </div>

          {/* Content */}
          <BiometryTab />
        </div>
      </div>
    </Layout>
  );
}