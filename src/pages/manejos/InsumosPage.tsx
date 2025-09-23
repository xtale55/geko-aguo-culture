import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TestTube } from '@phosphor-icons/react';
import { InputApplicationTab } from '@/components/InputApplicationTab';

export default function InsumosPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e9dac8 0%, #f5f0e8 50%, #ede3d3 100%)' }}>
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
                <div className="p-2 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg">
                  <TestTube className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-slate-700 bg-clip-text text-transparent">
                  Aplicação de Insumos
                </h1>
              </div>
              <p className="text-slate-600">
                Controle a aplicação de probióticos, fertilizantes e outros insumos
              </p>
            </div>
          </div>

          {/* Content */}
          <InputApplicationTab />
        </div>
      </div>
    </Layout>
  );
}