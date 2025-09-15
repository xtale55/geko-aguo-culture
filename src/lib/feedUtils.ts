import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica se uma mistura contém ração como ingrediente
 * @param recipeId ID da receita da mistura
 * @returns Promise<boolean> true se a mistura contém ração
 */
export async function mixtureContainsFeed(recipeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('mixture_ingredients')
      .select(`
        inventory_item_id,
        inventory:inventory!inner(category)
      `)
      .eq('recipe_id', recipeId)
      .eq('inventory.category', 'Ração');

    if (error) {
      console.error('Error checking mixture ingredients:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error in mixtureContainsFeed:', error);
    return false;
  }
}

/**
 * Busca itens de ração incluindo misturas que contêm ração
 * @param farmId ID da fazenda
 * @returns Promise<Array> Lista de itens de ração e misturas com ração
 */
export async function getFeedItemsIncludingMixtures(farmId: string) {
  try {
    // 1. Buscar itens de ração normais
    const { data: feedItems, error: feedError } = await supabase
      .from('inventory')
      .select('id, name, quantity, unit_price, category')
      .eq('farm_id', farmId)
      .eq('category', 'Ração')
      .gt('quantity', 0)
      .order('name');

    if (feedError) throw feedError;

    // 2. Buscar todas as misturas da fazenda
    const { data: mixtureItems, error: mixtureError } = await supabase
      .from('inventory')
      .select('id, name, quantity, unit_price, category')
      .eq('farm_id', farmId)
      .eq('category', 'Mistura')
      .gt('quantity', 0);

    if (mixtureError) throw mixtureError;

    // 3. Para cada mistura, verificar se contém ração
    const feedMixtures = [];
    if (mixtureItems) {
      for (const mixture of mixtureItems) {
        // Buscar receita da mistura
        const { data: recipeData, error: recipeError } = await supabase
          .from('mixture_recipes')
          .select('id')
          .eq('name', mixture.name)
          .eq('farm_id', farmId)
          .single();

        if (!recipeError && recipeData) {
          // Verificar se a receita contém ração
          const { data: ingredientsData, error: ingredientsError } = await supabase
            .from('mixture_ingredients')
            .select('inventory_item_id')
            .eq('recipe_id', recipeData.id);

          if (!ingredientsError && ingredientsData) {
            // Buscar as categorias dos itens
            const itemIds = ingredientsData.map(ing => ing.inventory_item_id);
            const { data: inventoryData, error: invError } = await supabase
              .from('inventory')
              .select('id, category')
              .in('id', itemIds);

            if (!invError && inventoryData) {
              const hasRacao = inventoryData.some(inv => inv.category === 'Ração');
              if (hasRacao) {
                feedMixtures.push(mixture);
              }
            }
          }
        }
      }
    }

    // 4. Combinar ração e misturas com ração
    const allFeedItems = [...(feedItems || []), ...feedMixtures];
    return allFeedItems.sort((a, b) => a.name.localeCompare(b.name));

  } catch (error) {
    console.error('Error getting feed items including mixtures:', error);
    return [];
  }
}