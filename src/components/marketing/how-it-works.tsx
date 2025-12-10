import Image from "next/image";

const steps = [
  {
    number: "1",
    title: "Tell us about your business",
    description:
      "What do you do? What resources do you have? Do you want to appear on camera, or would you rather create videos entirely with AI? We'll ask the right questions to understand your situation.",
    image: "/marketing/onboarding.jpg",
  },
  {
    number: "2",
    title: "Get ideas tailored to you",
    description:
      "We generate video ideas based on your business, your audience, and your resources. Each idea comes with a script and everything you need to actually make it.",
    image: "/marketing/ideas.jpg",
  },
  {
    number: "3",
    title: "We create the video",
    description:
      "Pick an idea, and we'll make it happen. If you want to be on camera, we'll guide you through a quick recording and handle all the editing. Prefer to stay off camera? We'll generate the whole video using AI avatars and voices.",
    image: "/marketing/create.jpg",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-grey-800 mb-4">
            How it works
          </h2>
          <p className="text-lg text-grey-400 max-w-2xl mx-auto">
            From setup to your first video idea in minutes.
          </p>
        </div>

        <div className="space-y-24">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div
                className={`space-y-4 ${index % 2 === 1 ? "lg:order-last" : ""}`}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-grey-800 text-white font-semibold text-lg">
                  {step.number}
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold text-grey-800">
                  {step.title}
                </h3>
                <p className="text-lg text-grey-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
              <div className={index % 2 === 1 ? "lg:order-first" : ""}>
                <Image
                  src={step.image}
                  alt={step.title}
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

