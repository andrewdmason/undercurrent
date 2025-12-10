import { Sparkles, Copy, MessageSquare } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Ideas that actually fit your business",
    description:
      "Not generic templates. Every idea is generated based on your business, your audience, and what you actually have the resources to make.",
  },
  {
    icon: Copy,
    title: "Scripts written for you",
    description:
      "Each idea comes with a full script. If you're recording yourself, we'll show it on a teleprompter. If you're using AI, we'll generate the whole thing.",
  },
  {
    icon: MessageSquare,
    title: "Record or generate—your choice",
    description:
      "Want to be on camera? We'll guide you through recording and edit it automatically. Prefer to stay behind the scenes? AI avatars and voices handle everything.",
  },
];

export function Features() {
  return (
    <section className="py-24 md:py-32 bg-grey-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-grey-800 mb-4">
            What you get
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-lg p-8 shadow-sm border border-grey-100-a"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-grey-50 text-grey-800 mb-6">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-grey-800 mb-3">
                {feature.title}
              </h3>
              <p className="text-grey-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

