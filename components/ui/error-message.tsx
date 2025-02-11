import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  error: string | null;
  className?: string;
}

export function ErrorMessage({ error, className = '' }: ErrorMessageProps) {
  const t = useTranslations();

  if (!error) return null;

  return (
    <div className={`flex items-center gap-2 text-red-500 text-sm ${className}`}>
      <AlertCircle className="w-4 h-4" />
      <span>{error}</span>
    </div>
  );
}
