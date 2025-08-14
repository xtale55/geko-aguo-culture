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
  }
};