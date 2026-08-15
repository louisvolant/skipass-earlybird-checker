// src/app/components/DBUsage.tsx

'use client';
import React from 'react';

interface DBUsageProps {
  dbSize: string | null;
}

export default function DBUsage({ dbSize }: DBUsageProps) {
  return (
    dbSize ? (
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Total Database Size: <span className="font-semibold">{dbSize || 'N/A'}</span>
        </p>
      </div>
    ) : null
  );
}