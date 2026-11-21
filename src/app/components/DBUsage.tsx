// src/app/components/DBUsage.tsx

'use client';
import React from 'react';

interface DBUsageProps {
  dbSize: string | null;
}

export default function DBUsage({ dbSize }: DBUsageProps) {
  if (!dbSize) {
    return null;
  }

  return (
    <div className="mt-4 flex justify-center">
      <span className="badge badge-ghost badge-sm text-xs px-3 py-2">
        Database Size: <strong className="ml-1 font-semibold">{dbSize}</strong>
      </span>
    </div>
  );
}
