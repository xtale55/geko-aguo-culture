import { StockingContent } from "@/components/StockingContent";
import { StockingHistory } from "@/components/StockingHistory";
import { Layout } from "@/components/Layout";

export default function Stocking() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50/50 to-slate-200/30">
        <div className="container mx-auto p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-slate-700 bg-clip-text text-transparent">Povoamento</h1>
          <p className="text-muted-foreground">Registre um novo lote de pós-larvas</p>
        </div>
        <StockingContent />
        <StockingHistory />
      </div>
      </div>
    </Layout>
  );
}