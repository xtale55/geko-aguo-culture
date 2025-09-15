import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface InventoryMovement {
  id: string;
  inventory_item_id: string;
  movement_type: 'entrada' | 'saida' | 'ajuste';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: string;
  reference_type?: string;
  reason?: string;
  notes?: string;
  created_at: string;
  created_by: string;
  farm_id: string;
  inventory_item?: {
    name: string;
    category: string;
  };
}

export function useInventoryMovements(itemId?: string, farmId?: string) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user && (itemId || farmId)) {
      fetchMovements();
    }
  }, [user, itemId, farmId]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('inventory_movements')
        .select(`
          *,
          inventory_item:inventory!inner(
            name,
            category,
            farm_id
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by specific item if provided
      if (itemId) {
        query = query.eq('inventory_item_id', itemId);
      }

      // Filter by farm if provided (through inventory item)
      if (farmId) {
        query = query.eq('inventory_item.farm_id', farmId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData: InventoryMovement[] = (data || []).map(item => ({
        id: item.id,
        inventory_item_id: item.inventory_item_id,
        movement_type: item.movement_type as 'entrada' | 'saida' | 'ajuste',
        quantity_change: item.quantity_change,
        previous_quantity: item.previous_quantity,
        new_quantity: item.new_quantity,
        reference_id: item.reference_id,
        reference_type: item.reference_type,
        reason: item.reason,
        notes: item.notes,
        created_at: item.created_at,
        created_by: item.created_by,
        farm_id: item.farm_id,
        inventory_item: item.inventory_item ? {
          name: (item.inventory_item as any)?.name || '',
          category: (item.inventory_item as any)?.category || ''
        } : undefined
      }));

      setMovements(transformedData);
    } catch (err: any) {
      console.error('Error fetching inventory movements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createManualMovement = async (
    inventoryItemId: string,
    movementType: 'entrada' | 'ajuste',
    quantityChange: number,
    reason: string,
    notes?: string
  ) => {
    try {
      // Get current inventory item to calculate new quantity
      const { data: inventoryItem, error: fetchError } = await supabase
        .from('inventory')
        .select('quantity, farm_id')
        .eq('id', inventoryItemId)
        .single();

      if (fetchError) throw fetchError;

      const previousQuantity = inventoryItem.quantity;
      const newQuantity = previousQuantity + quantityChange;

      if (newQuantity < 0) {
        throw new Error('Quantidade resultante não pode ser negativa');
      }

      // Insert movement record
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_item_id: inventoryItemId,
          movement_type: movementType,
          quantity_change: quantityChange,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          reference_type: 'manual',
          reason: reason,
          notes: notes || null,
          created_by: user?.id,
          farm_id: inventoryItem.farm_id
        });

      if (movementError) throw movementError;

      // Update inventory quantity
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', inventoryItemId);

      if (updateError) throw updateError;

      // Refresh movements
      await fetchMovements();
      
      return { success: true };
    } catch (err: any) {
      console.error('Error creating manual movement:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    movements,
    loading,
    error,
    refreshMovements: fetchMovements,
    createManualMovement
  };
}