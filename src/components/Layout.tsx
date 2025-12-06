"use client";

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
    <div
      className="
        w-full 
        overflow-x-hidden 
        flex flex-col 
        bg-black
      "
      style={{
        height: "calc(var(--vh) * 100)", // replaces h-screen
      }}
    >
      <Navbar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isModalOpen={isModalOpen}
      />

      <main
        className="
          flex-1
          min-h-0
          overflow-y-auto
          md:pl-20 md:pr-0
          pb-[calc(4rem+env(safe-area-inset-bottom))]
          scrollbar-hide
        "
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
