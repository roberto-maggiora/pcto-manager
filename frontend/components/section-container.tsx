"use client";

import { useEffect } from "react";

type SectionContainerProps = {
  section: "dashboard" | "projects" | "classes" | "students";
  children: React.ReactNode;
  className?: string;
};

export function SectionContainer({ section, children, className }: SectionContainerProps) {
  useEffect(() => {
    document.body.dataset.section = section;
    return () => {
      delete document.body.dataset.section;
    };
  }, [section]);

  return <div className={className}>{children}</div>;
}
