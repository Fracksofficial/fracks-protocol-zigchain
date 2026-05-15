import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // This layout is nested inside root layout which already has Header/Sidebar/Footer
  // Just pass through the children
  return <>{children}</>;
}