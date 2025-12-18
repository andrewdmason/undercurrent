"use client";

import { ImagesSection } from "@/components/brief/images-section";
import { useBrief } from "@/components/brief/brief-context";

export default function BriefImagesPage() {
  const { project, images } = useBrief();

  return <ImagesSection projectId={project.id} images={images} />;
}



