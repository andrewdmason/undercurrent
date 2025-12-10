// Visual styles for AI character generation
// Each style has a name, slug (for file paths), and a Gemini prompt

export type StyleType = "photo" | "illustration";

export interface VisualStyle {
  slug: string;
  name: string;
  type: StyleType;
  prompt: string;
}

export const VISUAL_STYLES: VisualStyle[] = [
  {
    slug: "3d-animation",
    name: "3D Animation",
    type: "illustration",
    prompt: `Rendered in a style that maintains subject and composition with smooth, sculpted 3D forms, matte surfaces, and simplified expressive characters featuring large eyes and playful proportions, paired with soft lighting, gentle shadows, and bold saturated colors like peach, teal, and mustard for a clean, cheerful aesthetic reminiscent of modern brand animations or UI explainers.`,
  },
  {
    slug: "analog-future",
    name: "Analog Future",
    type: "illustration",
    prompt: `A retro-futuristic scene imagined through the lens of the 1980s, where outdated technology feels advanced and comforting. Everything is rendered with soft tungsten lighting and a film-like grain, creating a muted palette of peachy creams, dusty reds, olive greens, and warm beige tones. The environment should feel tactile and mechanical — full of analog textures. Wires are visible and slightly tangled, tape reels spin quietly, and cathode-ray displays flicker gently with static or glitchy overlays. Lighting is cinematic but warm, casting long amber shadows across formica countertops, metal walls, or textured flooring. Characters wear muted tech-era clothing — corduroy jackets, turtlenecks, sweater vests, or work shirts — grounded, focused, and immersed in their tasks. Humanoid AIs -- if featured -- appear boxy and mechanical, with blinking lights or faceplates resembling old-school interfaces. The tone is quiet, nostalgic, and precise — like a lost scene from a 1980s sci-fi film that believed this would be the future. Everything feels slightly dry, metallic, and calmly futuristic.`,
  },
  {
    slug: "anime",
    name: "Anime",
    type: "illustration",
    prompt: `Illustrated in a style that maintains subject and composition fidelity while evoking a cinematic slice-of-life anime aesthetic, with expressive, stylized characters, clean linework, and natural poses, lit by warm, atmospheric light filtered through windows, lanterns, or screens, casting soft gradients across rich, textural environments like wooden cafés or tidy studios in muted palettes of peach, cedar, teal, and cream.`,
  },
  {
    slug: "black-and-white",
    name: "Black and White",
    type: "photo",
    prompt: `Photographed in a realistic black and white style that emphasizes light, texture, and composition to create emotional depth; characters appear in sharp focus against softly blurred or subtly textured backgrounds, with natural or screen-based lighting casting strong contrasts across skin, fabric, metal, and glass, evoking a quiet, introspective, and timeless atmosphere with cinematic restraint, intentional shadows and reflections, and a grainy softness that highlights solitude, collaboration, or focus with emotional clarity.`,
  },
  {
    slug: "cartoon",
    name: "Cartoon",
    type: "illustration",
    prompt: `Illustrated in a style that maintains subject and composition clarity with bold outlines, flat colors, and friendly, exaggerated proportions; characters are expressive with big eyes and gestural hands, set in softly lit, tidy scenes featuring minimal shadows, light crosshatching, or subtle drop tones, with a bright but slightly desaturated palette and a whimsical, relatable tone.`,
  },
  {
    slug: "childrens-book",
    name: "Children's Book",
    type: "illustration",
    prompt: `Illustrated in a style that evokes classic and modern children's picture books, with saturated pastel or golden tones, soft textures, and whimsical character designs featuring wide eyes and exaggerated expressions, set in imaginative, narrative-rich scenes filled with glowing objects, floating ideas, magical weather, or cozy nooks; lighting is soft and diffused, adding mood without drama, and the tone is curious, enchanted, and full of heart.`,
  },
  {
    slug: "cinematic",
    name: "Cinematic",
    type: "photo",
    prompt: `Photographed in a style that mimics the clean, high-end clarity and depth of a professional commercial camera setup, with balanced natural lighting, subtle color grading, and a realistic palette free from golden-hour warmth or visible film grain; the image features shallow depth of field, crisp foreground detail, creamy background blur, and natural lens compression, evoking the look of a polished brand film or tech lifestyle campaign.`,
  },
  {
    slug: "digital-illustration",
    name: "Digital Illustration",
    type: "illustration",
    prompt: `Illustrated in a colorful, playful digital comic style with bold clean outlines, simplified proportions, and expressive gestures; characters have slightly exaggerated, friendly faces, with a bright palette of primary colors and pastels applied in solid fills or subtle crayon textures, set against minimalist backgrounds often accented with whimsical floating objects like sticky notes or crayons, all contributing to an upbeat, informal tone ideal for creative or classroom-like scenes.`,
  },
  {
    slug: "flat-illustration",
    name: "Flat Illustration",
    type: "illustration",
    prompt: `Illustrated in a clean, modern flat design style using bold color blocks, simple geometric shapes, and filled forms without outlines; subtle layering and soft, directional lighting create contrast, while minimal backgrounds with angled color planes or abstract elements add depth without clutter, all rendered in a warm, balanced palette of muted reds, deep blues, terracotta, peach, and cream to convey a professional, approachable, and editorial tone.`,
  },
  {
    slug: "graphic-novel",
    name: "Graphic Novel",
    type: "illustration",
    prompt: `Illustrated in a warm, expressive style featuring fluid linework, naturalistic proportions, and either soft black outlines or none at all; scenes are lit with gentle ambient light from windows or desk lamps, casting diffused shadows and soft highlights across thoughtfully composed environments, with cohesive palettes of desaturated earth tones, muted pastels, and warm neutrals accented by terracotta, dusty rose, or soft green, evoking a painterly, emotional tone suited for lifestyle storytelling and reflective moments.`,
  },
  {
    slug: "line-art",
    name: "Line Art",
    type: "illustration",
    prompt: `Illustrated in a minimalist line art style using clean, thin black outlines with no shading and minimal facial detail, where figures and environments are composed of geometric shapes and uniform stroke weights; backgrounds feature soft gray blobs or abstract contours to suggest space, with limited, purposeful accent colors like beige, muted blue, or terracotta highlighting key elements, all contributing to a modern, clear, and schematic visual tone.`,
  },
  {
    slug: "marker",
    name: "Marker",
    type: "illustration",
    prompt: `Illustrated in a loose, expressive marker style with black brush pen or marker linework that varies in thickness and overlaps imperfectly, paired with semi-transparent color fills that bleed slightly outside the lines like digital strokes or ink washes; scenes resemble sketchbook drafts with playful roughness and emotional clarity, featuring figures in motion, casual environments, and simplified yet lively details, all contributing to a warm, thoughtful, and spontaneous tone.`,
  },
  {
    slug: "natural-lighting",
    name: "Natural Lighting",
    type: "photo",
    prompt: `Photographed in a candid, natural lighting style using only ambient daylight with no visible lighting gear or stylized grading; the scene is softly illuminated by indirect light from windows or open spaces, with diffused shadows and gentle wraps that reveal subtle textures like skin, fabric, and woodgrain, capturing grounded, human moments in ordinary but thoughtfully composed settings that feel clear, calm, and collaborative.`,
  },
  {
    slug: "paper-cutout",
    name: "Paper Cutout",
    type: "illustration",
    prompt: `Illustrated in a handcrafted paper cut-out style using layered, textured paper shapes with visible grain—like watercolor or construction paper—to build figures and objects with soft shadows, offset alignments, and organic, hand-cut edges; characters feature simplified yet realistic proportions with expressive minimal features, all in a muted, tactile palette of terracotta, sage, mustard, and dusty blue, evoking a warm, structured, and human-made tone without digital gloss or artificial gradients.`,
  },
  {
    slug: "pop-art",
    name: "Pop Art",
    type: "illustration",
    prompt: `Illustrated in a style that channels mid-century Pop Art and comic book aesthetics, with thick black outlines, flat saturated colors, halftone textures, and exaggerated expressions; uses dramatic lighting in vivid hues like yellow, red, purple, and blue to heighten action and humor, with graphic details such as sound effects, dot patterns, and bold accessories that contribute to its playful, high-energy tone.`,
  },
  {
    slug: "realistic-painting",
    name: "Realistic Painting",
    type: "illustration",
    prompt: `Rendered in a richly atmospheric digital painting style with soft, textured brushstrokes and smooth color blending, where form is defined by light and shade rather than outlines; scenes feature nuanced lighting like warm spotlights or ambient glows, with subtle reflections and blurred or desaturated backgrounds that enhance depth, while faces, hair, and fabrics show detailed rendering in a warm, cinematic palette with muted tones and tonal harmony to evoke an intimate, grounded, and expressive mood.`,
  },
  {
    slug: "solar-punk",
    name: "Solar Punk",
    type: "photo",
    prompt: `Photographed in an editorial solarpunk style blending real-world architecture with biophilic design, where golden sunlight streams through skylights or large windows, casting soft, organic shadows across interiors filled with trailing vines, moss panels, and rooftop greenery; the palette draws from nature—sage, ochre, terracotta, mustard—and the scene feels breathable, grounded, and optimistic, with subtle technology and human-focused depth of field evoking a hopeful, achievable future.`,
  },
  {
    slug: "studio-lighting",
    name: "Studio Lighting",
    type: "photo",
    prompt: `Photographed with cinematic studio lighting that mimics a polished creator setup or brand shoot, featuring soft, directional light from off-frame sources that cast balanced highlights and subtle shadows across the subject and workspace; the scene feels real yet refined, with softly blurred, styled backgrounds of shelves, decor, and plants, true-to-life color grading, and a focused, inviting tone that blends professionalism with warmth.`,
  },
  {
    slug: "stop-motion",
    name: "Stop Motion",
    type: "illustration",
    prompt: `Rendered in a handcrafted, cinematic style that mimics miniature stop-motion sets built from physical materials like polymer clay, felt, and painted wood, with sculpted characters featuring bead-like eyes, oversized heads, and fabric-sewn clothes, all arranged in richly textured environments lit by practical sources casting deep directional shadows and evoking a charming, imperfect, and lovingly posed scene paused mid-narrative.`,
  },
  {
    slug: "surrealist",
    name: "Surrealist",
    type: "illustration",
    prompt: `Illustrated in a style that channels dreamlike surrealism inspired by Salvador Dalí, with warped perspectives, morphing figures, and symbolic objects like melting clocks and floating eyes placed in uncanny, painterly compositions; backgrounds blur interiors and landscapes—such as desert floors meeting office walls or cloud-filled windows—under muted palettes of sepia, sandy gold, and pale teal with elongated shadows and soft, antique textures.`,
  },
  {
    slug: "watercolor",
    name: "Watercolor",
    type: "illustration",
    prompt: `Illustrated in a soft, fluid watercolor style with transparent washes, flowing brush strokes, and layered pigments that gently bleed at the edges, where forms are shaped by tone and shadow rather than outlines; lighting is natural and diffused, often ambient or dappled, with impressionistic backgrounds and visible paper grain adding organic texture and contemplative warmth.`,
  },
];

// Helper to get a style by slug
export function getStyleBySlug(slug: string): VisualStyle | undefined {
  return VISUAL_STYLES.find((s) => s.slug === slug);
}

// Helper to get style thumbnail path
export function getStyleThumbnailPath(slug: string): string {
  return `/styles/${slug}.jpg`;
}

