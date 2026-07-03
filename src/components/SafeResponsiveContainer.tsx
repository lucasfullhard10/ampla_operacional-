import React, { useState, useEffect } from "react";
import { ResponsiveContainer } from "recharts";

interface SafeResponsiveContainerProps {
  children: React.ReactElement;
  width?: string | number;
  height?: string | number;
  minHeight?: number;
}

export const SafeResponsiveContainer: React.FC<SafeResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minHeight = 300,
}) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Safely delay rendering until layout has fully resolved and component is stable
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 150);

    return () => {
      clearTimeout(timer);
      setShouldRender(false);
    };
  }, []);

  if (!shouldRender) {
    return (
      <div 
        style={{ width: "100%", height: typeof height === "number" ? height : minHeight, minHeight }} 
        className="flex items-center justify-center bg-slate-900/20 rounded-xl border border-slate-800"
      >
        <div className="text-slate-500 animate-pulse text-xs font-mono">Carregando gráfico...</div>
      </div>
    );
  }

  return (
    <div 
      style={{ width: "100%", height: typeof height === "number" ? height : minHeight, minHeight }} 
      className="w-full h-full relative"
    >
      <ResponsiveContainer width={width} height={height} minHeight={minHeight}>
        {children}
      </ResponsiveContainer>
    </div>
  );
};

export default SafeResponsiveContainer;
