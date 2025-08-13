import { StockingContent } from "@/components/StockingContent";
import Layout from "@/components/Layout";

export default function Stocking() {
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Povoamento</h1>
          <p className="text-muted-foreground">Registre um novo lote de pós-larvas</p>
        </div>
        <StockingContent />
      </div>
    </Layout>
  );
}