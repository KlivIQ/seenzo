export interface GlossaryTerm {
  term: string;
  short?: string;
  definition: string;
}

export const glossary: GlossaryTerm[] = [
  {
    term: "AEO (Answer Engine Optimization)",
    definition:
      "The practice of structuring your website so answer engines — Google's AI Overviews, Siri, Alexa, voice search and featured snippets — can lift a clean, direct answer from your page. For Indian startups and small businesses, AEO is often the fastest way to appear when a customer asks a question out loud or on a phone.",
  },
  {
    term: "AI Overviews (Google SGE)",
    definition:
      "Google's AI-generated summary that sits above the traditional blue-link results for many queries. If your business isn't cited inside AI Overviews, you can lose clicks even when you rank on page one. Winning AI Overview citations requires clear structured data, trustworthy content, and consistent brand mentions across the web.",
  },
  {
    term: "AI Search",
    definition:
      "The broad shift where buyers ask AI assistants — ChatGPT, Gemini, Perplexity, Claude, Copilot — instead of typing into a search engine. AI search rarely returns ten links; it returns one paragraph. Being the business named in that paragraph is the new #1 result.",
  },
  {
    term: "AI Visibility Score",
    definition:
      "Seenzo's 0–100 score that measures how well ChatGPT, Gemini, Perplexity and Claude can describe an Indian business. It rolls up crawlability, structured data, metadata, content quality, India presence and trust into one honest number, with a plain-English fix list.",
  },
  {
    term: "Anthropic Claude",
    definition:
      "The family of AI assistants built by Anthropic. Claude is used by many enterprises and increasingly by Indian professionals for research, drafting and analysis. Businesses that want to be recommended inside Claude need clean, factual public content and strong entity signals.",
  },
  {
    term: "Bing Copilot",
    definition:
      "Microsoft's AI-powered search experience inside Bing and Windows. Copilot pulls from public web content plus Microsoft's index, so consistent NAP (name, address, phone) details and structured data improve the odds of being cited.",
  },
  {
    term: "ChatGPT Search",
    definition:
      "OpenAI's search feature inside ChatGPT that browses the live web to answer buyer questions. For Indian small businesses, this is often the first place a founder or CXO discovers vendors. Getting mentioned by name — with the right context — is the goal.",
  },
  {
    term: "Citation",
    definition:
      "A mention of your business inside an AI answer, ideally with a link back to your site or a directory listing. Citations are the new backlinks: they carry authority, drive discovery, and compound over time.",
  },
  {
    term: "Crawlability",
    definition:
      "Whether AI crawlers such as GPTBot, PerplexityBot, ClaudeBot and Google-Extended can actually read your pages. Blocking these bots in robots.txt is one of the most common reasons Indian SMB sites are invisible to AI engines.",
  },
  {
    term: "DPDP Act 2023",
    definition:
      "India's Digital Personal Data Protection Act, which governs how businesses collect, store and process personal data of Indian users. Any AI or SaaS product serving Indian customers — including Seenzo — must publish a DPDP-compliant privacy policy and honour deletion requests.",
  },
  {
    term: "Entity SEO",
    definition:
      "Optimising for who and what your business is — not just keywords. Entity SEO uses schema markup, Wikipedia/Wikidata, LinkedIn, Google Business Profile and consistent branding so search engines and LLMs recognise your business as a distinct entity.",
  },
  {
    term: "Featured Snippet",
    definition:
      "A short answer block Google lifts from a page and displays at the top of results. Featured snippets were the first version of Answer Engine Optimization and remain a strong signal that your content is answer-worthy for AI systems.",
  },
  {
    term: "Gemini (Google)",
    definition:
      "Google's family of AI models powering the Gemini app, Google AI Overviews and Workspace assistants. Because Gemini is deeply wired into Google's index, classic SEO fundamentals — clean HTML, schema, quality backlinks — still shape how it describes your business.",
  },
  {
    term: "Generative AI",
    definition:
      "AI systems that generate new text, images, audio or code from a prompt, rather than just retrieving existing results. For Indian startups, generative AI is both an opportunity (build faster, market smarter) and a new distribution channel to be discovered in.",
  },
  {
    term: "GEO (Generative Engine Optimization)",
    definition:
      "The practice of making sure generative AI engines — ChatGPT, Gemini, Perplexity, Claude — mention your business by name, accurately, when asked buyer-intent questions. GEO combines classic SEO, entity clarity, structured data and public trust signals like GST, LinkedIn and directory listings.",
  },
  {
    term: "GST as a trust signal",
    definition:
      "For Indian businesses, publishing your GSTIN on your website and directory listings is a quiet but powerful trust cue. AI engines and buyers alike use it to distinguish a legitimate registered business from a hobby site.",
  },
  {
    term: "Hallucination",
    definition:
      "When an AI confidently states something that is wrong — a fake founder name, a wrong pricing tier, a service you don't offer. Hallucinations about your business are best countered by publishing clear, authoritative, well-structured facts on your own site.",
  },
  {
    term: "Knowledge Graph",
    definition:
      "A structured map of entities — people, places, businesses, products — and the relationships between them. Google's Knowledge Graph and Wikidata are heavily used by LLMs, so getting your business represented in them lifts AI visibility across engines.",
  },
  {
    term: "LLM (Large Language Model)",
    definition:
      "The underlying technology behind ChatGPT, Gemini, Claude and Perplexity. LLMs are trained on huge amounts of public text and then fine-tuned to answer questions, summarise, and cite sources. GEO is essentially the discipline of being a good source they cite.",
  },
  {
    term: "llms.txt",
    definition:
      "An emerging convention: a plain-text file at the root of your site (like robots.txt) that gives LLMs a curated map of your most important content. Seenzo publishes one at /llms.txt and recommends every Indian business do the same.",
  },
  {
    term: "Local SEO (India)",
    definition:
      "Optimising your presence for city-level and neighbourhood-level searches — Google Business Profile, Justdial, Sulekha, Zomato, Practo, IndiaMART and other India-first directories. Strong local SEO feeds directly into AI answers about businesses near me in Chennai, Bengaluru, Mumbai and beyond.",
  },
  {
    term: "Perplexity",
    definition:
      "An AI answer engine that combines an LLM with live web search and always cites its sources. Perplexity is often used by Indian professionals for research and vendor discovery, which makes it a high-intent channel for B2B businesses.",
  },
  {
    term: "Prompt",
    definition:
      "The natural-language question or instruction a user gives an AI system. Understanding the prompts your customers actually type — Best CA in Chennai for startups, ERP for a 20-person garments unit — is the first step in GEO.",
  },
  {
    term: "RAG (Retrieval-Augmented Generation)",
    definition:
      "A pattern where an LLM retrieves fresh information from the web or a private knowledge base before answering. Perplexity, ChatGPT Search and AI Overviews all use RAG, which is why the current state of your public content matters more than ever.",
  },
  {
    term: "Schema Markup / Structured Data",
    definition:
      "Machine-readable tags (usually JSON-LD from schema.org) that describe your pages to search engines and LLMs: Organization, LocalBusiness, Product, FAQPage, Article. Structured data is one of the highest-ROI fixes in the Seenzo report.",
  },
  {
    term: "SEO (Search Engine Optimization)",
    definition:
      "The classic practice of ranking higher on Google's blue-link results through content, technical health and backlinks. SEO is not dead — it feeds GEO and AEO. A site that ranks well on Google is almost always easier for AI engines to cite.",
  },
  {
    term: "Zero-Click Search",
    definition:
      "A search that ends without a click, because the answer is displayed right on the results page or inside an AI assistant. Zero-click is now the default for many queries, which is why being named inside the answer beats ranking below it.",
  },
];