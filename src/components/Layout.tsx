import React, { ReactNode, useEffect } from "react";
import Navbar from "./Navbar";
import { useNavigation } from "@/hooks/useNavigation";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface LayoutProps {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isModalOpen?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  isModalOpen,
}) => {
  const { resetNavigation } = useNavigation();

  useEffect(() => {
    resetNavigation();
  }, [activeTab, resetNavigation]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <Navbar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isModalOpen={isModalOpen}
      />

      {/* Padding so content isn’t hidden by sidebar or bottom nav */}
      <main className="flex-1 min-h-0 overflow-y-auto md:pl-20 md:pr-0 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
};

export default Layout;
