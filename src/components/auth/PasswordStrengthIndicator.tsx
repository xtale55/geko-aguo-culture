import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const getStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const getStrengthText = (score: number) => {
    if (score === 0) return '';
    if (score <= 2) return 'Fraca';
    if (score <= 3) return 'Média';
    if (score <= 4) return 'Forte';
    return 'Muito Forte';
  };

  const getStrengthColor = (score: number) => {
    if (score === 0) return '';
    if (score <= 2) return 'text-destructive';
    if (score <= 3) return 'text-warning-foreground';
    if (score <= 4) return 'text-accent';
    return 'text-success';
  };

  const strength = getStrength(password);
  const strengthText = getStrengthText(strength);
  const strengthColor = getStrengthColor(strength);

  if (!password || strength === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              level <= strength
                ? strength <= 2
                  ? 'bg-destructive'
                  : strength <= 3
                  ? 'bg-warning'
                  : strength <= 4
                  ? 'bg-accent'
                  : 'bg-success'
                : 'bg-muted'
            )}
          />
        ))}
      </div>
      {strengthText && (
        <p className={cn('text-xs font-medium', strengthColor)}>
          Força da senha: {strengthText}
        </p>
      )}
    </div>
  );
}