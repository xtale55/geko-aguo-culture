/**
 * Sistema de unidades flexível para inventário
 * Converte diferentes unidades de compra para gramas (unidade base)
 */

export interface PurchaseUnit {
  name: string;
  multiplier: number; // Multiplicador para converter para gramas
  category: 'weight' | 'volume' | 'unit';
}

export const PURCHASE_UNITS: Record<string, PurchaseUnit> = {
  'g': { name: 'Grama (g)', multiplier: 1, category: 'weight' },
  'kg': { name: 'Quilograma (kg)', multiplier: 1000, category: 'weight' },
  'saca25kg': { name: 'Saca 25kg', multiplier: 25000, category: 'weight' },
  'saca30kg': { name: 'Saca 30kg', multiplier: 30000, category: 'weight' },
  'saca40kg': { name: 'Saca 40kg', multiplier: 40000, category: 'weight' },
  'saca50kg': { name: 'Saca 50kg', multiplier: 50000, category: 'weight' },
  'balde10kg': { name: 'Balde 10kg', multiplier: 10000, category: 'weight' },
  'balde15kg': { name: 'Balde 15kg', multiplier: 15000, category: 'weight' },
  'balde20kg': { name: 'Balde 20kg', multiplier: 20000, category: 'weight' },
  'balde25kg': { name: 'Balde 25kg', multiplier: 25000, category: 'weight' },
  'litro': { name: 'Litro (L)', multiplier: 1000, category: 'volume' }, // Aproximação: 1L = 1kg
  'unidade': { name: 'Unidade (un)', multiplier: 1, category: 'unit' }
};

/**
 * Converte quantidade da unidade de compra para gramas
 */
export function convertToGrams(quantity: number, unit: string): number {
  const unitConfig = PURCHASE_UNITS[unit];
  if (!unitConfig) {
    throw new Error(`Unidade não suportada: ${unit}`);
  }
  return Math.round(quantity * unitConfig.multiplier);
}

/**
 * Converte gramas para a unidade de compra
 */
export function convertFromGrams(grams: number, unit: string): number {
  const unitConfig = PURCHASE_UNITS[unit];
  if (!unitConfig) {
    throw new Error(`Unidade não suportada: ${unit}`);
  }
  return Number((grams / unitConfig.multiplier).toFixed(3));
}

/**
 * Calcula o preço por kg baseado no preço da unidade de compra
 */
export function calculatePricePerKg(unitPrice: number, unit: string): number {
  const unitConfig = PURCHASE_UNITS[unit];
  if (!unitConfig) {
    throw new Error(`Unidade não suportada: ${unit}`);
  }
  
  const pricePerGram = unitPrice / unitConfig.multiplier;
  return Number((pricePerGram * 1000).toFixed(2));
}

/**
 * Formatar valor monetário
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formatar quantidade com unidade
 */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
  const unitConfig = PURCHASE_UNITS[unit];
  if (!unitConfig) return `${quantity}`;
  
  const formattedQuantity = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2);
  return `${formattedQuantity} ${unitConfig.name}${quantity !== 1 ? 's' : ''}`;
}

/**
 * Calcular totais para confirmação
 */
export function calculatePurchaseTotals(
  quantity: number,
  unit: string,
  unitPrice: number
) {
  const totalGrams = convertToGrams(quantity, unit);
  const totalKg = totalGrams / 1000;
  const totalValue = quantity * unitPrice;
  const pricePerKg = calculatePricePerKg(unitPrice, unit);
  
  return {
    totalGrams,
    totalKg,
    totalValue,
    pricePerKg,
    formattedTotalKg: `${totalKg.toFixed(2)} kg`,
    formattedTotalValue: formatCurrency(totalValue),
    formattedPricePerKg: formatCurrency(pricePerKg),
    formattedQuantity: formatQuantityWithUnit(quantity, unit)
  };
}