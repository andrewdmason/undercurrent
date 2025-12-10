import Image from "next/image";

export function DescriptCallout() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <Image
              src="/marketing/descript.jpg"
              alt="Descript video editing interface"
              width={600}
              height={400}
              className="rounded-lg shadow-lg"
            />
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-semibold text-grey-800">
              Powered by Descript
            </h2>
            <p className="text-lg text-grey-400 leading-relaxed">
              The actual video creation happens in{" "}
              <span className="text-grey-800 font-medium">Descript</span>, using
              their AI editing assistant called Underlord. Think of it as
              vibe-editing: you describe what you want, and it makes the video.
            </p>
            <p className="text-lg text-grey-400 leading-relaxed">
              If you record yourself, Underlord handles the editing—cutting
              filler words, adding captions, cleaning up the audio. If you go
              the AI route, it generates the avatar, the voice, and the whole
              video from your script.
            </p>
            <p className="text-grey-400">
              Don&apos;t have Descript yet?{" "}
              <a
                href="https://www.descript.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue underline hover:no-underline"
              >
                Check it out
              </a>
              —it&apos;s free to start.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

