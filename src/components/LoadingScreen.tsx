import { Hourglass } from "@phosphor-icons/react";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Carregando..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Hourglass 
            className="h-12 w-12 text-primary animate-spin" 
            style={{
              animation: "spin 2s linear infinite"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent rounded-full blur-xl"></div>
        </div>
        <p className="text-muted-foreground font-medium animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}