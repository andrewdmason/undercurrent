"use client";

import { BusinessInfoForm } from "@/components/strategy/business-info-form";
import { useSettings } from "@/components/settings/settings-context";

export default function SettingsGeneralPage() {
  const { business } = useSettings();

  return <BusinessInfoForm business={business} />;
}
