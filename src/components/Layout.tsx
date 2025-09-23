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
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      <Navbar />
      <HybridNav activeTab={activeTab} onTabChange={onTabChange} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default Layout;
