import React, { ReactNode, useEffect } from "react";
import Navbar from "./Navbar";
import HybridNav from "./HybridNav";
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

  // 🔑 Reset navigation whenever the active tab changes
  useEffect(() => {
    resetNavigation();
  }, [activeTab, resetNavigation]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <Navbar />

      <HybridNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        isModalOpen={isModalOpen}
      />

      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
};

export default Layout;
