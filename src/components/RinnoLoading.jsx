import React from "react";

// RINNO global loading screen — R icon on navy background with subtle breathing animation
export default function RinnoLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[hsl(var(--rinno-nav))] z-50">
      <img
        src="https://media.base44.com/images/public/6ab02bee49c85daaead936e9/b507d6b8c_LOGOPANTALLADECARGA.png"
        alt="RINNO"
        className="w-24 h-24 object-contain animate-pulse"
      />
    </div>
  );
}