"use client";

import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({
  children,
  className = "",
  ...props
}: BtnProps & { children?: React.ReactNode }) {
  return (
    <button
      {...props}
      className={`bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: BtnProps & { children?: React.ReactNode }) {
  return (
    <button
      {...props}
      className={`bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className = "",
  ...props
}: BtnProps & { children?: React.ReactNode }) {
  return (
    <button {...props} className={`border px-3 py-2 rounded-md ${className}`}>
      {children}
    </button>
  );
}
