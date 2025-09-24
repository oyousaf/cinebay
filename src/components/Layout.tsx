import React, { ReactNode } from "react";
import Navbar from "./Navbar";
import HybridNav from "./HybridNav";

type Tab = "movies" | "tvshows" | "search" | "devspick" | "watchlist";

interface LayoutProps {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <Navbar />

      <HybridNav activeTab={activeTab} onTabChange={onTabChange} />

      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
};

export default Layout;
