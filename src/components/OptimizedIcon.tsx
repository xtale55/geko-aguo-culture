import { memo } from 'react';
import { LucideProps } from 'lucide-react';

// Tree-shaken icon imports for better performance
export const AlertTriangleIcon = memo((props: LucideProps) => {
  const { size = 24, color = 'currentColor', strokeWidth = 2, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <circle cx="12" cy="17" r="1"/>
    </svg>
  );
});

export const FishIcon = memo((props: LucideProps) => {
  const { size = 24, color = 'currentColor', strokeWidth = 2, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/>
      <path d="M18 12v.5"/>
      <path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/>
      <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1.13-.18-1.85.24-1.85 1.41v10.18c0 1.17.72 1.59 1.85 1.41C5.58 18.03 7 16 7 13.33"/>
      <path d="m11.5 12.5 5-5"/>
      <path d="m11.5 12.5 5 5"/>
    </svg>
  );
});

export const UtensilsIcon = memo((props: LucideProps) => {
  const { size = 24, color = 'currentColor', strokeWidth = 2, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
    </svg>
  );
});

export const PackageIcon = memo((props: LucideProps) => {
  const { size = 24, color = 'currentColor', strokeWidth = 2, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="m7.5 4.27 9 5.15"/>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  );
});

AlertTriangleIcon.displayName = 'AlertTriangleIcon';
FishIcon.displayName = 'FishIcon';
UtensilsIcon.displayName = 'UtensilsIcon';
PackageIcon.displayName = 'PackageIcon';