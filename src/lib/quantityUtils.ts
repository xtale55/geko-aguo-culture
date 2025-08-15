/**
 * Sistema Anti-Drift: Utilitários para Conversão de Quantidades
 * 
 * Elimina erros de ponto flutuante armazenando tudo em gramas (inteiros)
 * Mantém interface amigável em kg para os usuários
 */

export const QuantityUtils = {
  /**
   * Converter kg para gramas (interface → database)
   * @param kg Quantidade em kg (input do usuário)
   * @returns Gramas como inteiro (para database)
   */
  kgToGrams: (kg: number): number => Math.round(kg * 1000),
  
  /**
   * Converter gramas para kg (database → interface)
   * @param grams Gramas como inteiro (do database)
   * @returns Kg como decimal
   */
  gramsToKg: (grams: number): number => grams / 1000,
  
  /**
   * Formatação para display (sempre 1 casa decimal)
   * @param grams Gramas como inteiro (do database)
   * @returns String formatada em kg (ex: "1.5")
   */
  formatKg: (grams: number): string => (grams / 1000).toFixed(1),
  
  /**
   * Parse input do usuário para gramas
   * @param input String ou número em kg
   * @returns Gramas como inteiro
   */
  parseInputToGrams: (input: string | number): number => {
    const kg = typeof input === 'string' ? parseFloat(input) || 0 : input;
    return Math.round(kg * 1000);
  },

  /**
   * Validação de entrada (kg)
   * @param input Entrada do usuário
   * @returns true se válido
   */
  isValidKg: (input: string | number): boolean => {
    const kg = typeof input === 'string' ? parseFloat(input) : input;
    return !isNaN(kg) && kg >= 0;
  },

  /**
   * Calcular FCA (Feed Conversion Ratio) corretamente
   * @param totalFeedGrams Total de ração consumida em gramas
   * @param biomassGainKg Ganho de biomassa em kg
   * @returns FCA
   */
  calculateFCA: (totalFeedGrams: number, biomassGainKg: number): number => {
    if (!biomassGainKg || biomassGainKg <= 0) return 0;
    const totalFeedKg = totalFeedGrams / 1000;
    return totalFeedKg / biomassGainKg;
  },

  /**
   * Calcular crescimento semanal
   * @param initialWeight Peso inicial em gramas
   * @param finalWeight Peso final em gramas
   * @param daysBetween Dias entre as medições
   * @returns Crescimento semanal em gramas
   */
  calculateWeeklyGrowth: (initialWeight: number, finalWeight: number, daysBetween: number): number => {
    if (!daysBetween || daysBetween <= 0) return 0;
    const weightGain = finalWeight - initialWeight;
    const weeksBetween = daysBetween / 7;
    return weeksBetween > 0 ? weightGain / weeksBetween : 0;
  },

  /**
   * Calcular custos proporcionais para despesca parcial
   * @param totalCost Custo total do ciclo
   * @param harvestedBiomass Biomassa despescada
   * @param totalBiomassProduced Biomassa total produzida no ciclo
   * @returns Custo proporcional
   */
  calculateProportionalCost: (totalCost: number, harvestedBiomass: number, totalBiomassProduced: number): number => {
    if (!totalBiomassProduced || totalBiomassProduced <= 0) return 0;
    return totalCost * (harvestedBiomass / totalBiomassProduced);
  }
};