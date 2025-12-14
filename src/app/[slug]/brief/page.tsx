"use client";

import { BusinessInfoForm } from "@/components/brief/business-info-form";
import { useBrief } from "@/components/brief/brief-context";

export default function BriefBusinessInfoPage() {
  const { project } = useBrief();

  return (
    <div>
      <BusinessInfoForm project={project} />
    </div>
  );
}

