# TripGuard

> Your AI legal co-pilot for traveling Vietnam. Know the law before it knows you.

---

## Inspiration

Every year, thousands of tourists in Vietnam unknowingly break the law — riding a motorbike with an invalid international license, flying a drone over a restricted zone, carrying undeclared cash through customs, or overstaying a visa by a few days. The information exists, but it's buried in Vietnamese legal documents, scattered across outdated blog posts, and impossible to access in a moment of stress.

We built TripGuard because we believe no traveler should face a 4,000,000 VND fine — or worse — simply because they didn't know the rules.

---

## What it does

TripGuard is a mobile AI assistant that gives foreign tourists in Vietnam instant, accurate answers about local laws and regulations — in plain English.

- **Ask anything**: "Can I ride a motorbike with my US license?" "Is my drone allowed near Hội An?" "What happens if I overstay my visa?"
- **Emergency scripts**: Step-by-step guidance for high-stress situations — police stops, drone confiscations, visa overstays, drug tests — with exact fine amounts and emergency hotlines
- **Personalized by nationality**: Responses adapt based on your country (IDP convention, visa-free days, driving rules)
- **RAG-powered legal accuracy**: Answers are grounded in official Vietnamese legislation — traffic fines (NĐ 168/2024), drone regulations (NĐ 288/2025), immigration law (NĐ 07/2023), customs, heritage protection, and drug laws
- **Live web search**: Augments static knowledge with real-time updates from trusted Vietnamese government sources
- **Voice responses**: ElevenLabs TTS for hands-free audio answers
- **Vision input**: Upload a sign, document, or notice for instant interpretation

---

## How we built it

**Backend (Python / FastAPI)**
- Multilingual embedding model for semantic search across Vietnamese legal texts
- ChromaDB vector database with 6 separate collections — one per legal domain (traffic, drone, immigration, customs, drug, cultural heritage)
- Keyword-based category classifier + cosine similarity threshold for retrieval precision
- Agentic reasoning loop with tool use: RAG retrieval, web search (Tavily), web crawl (TinyFish), emergency scripts, vision analysis
- OpenAI GPT-4o for generation; ElevenLabs for TTS audio

**Frontend (React Native / Expo)**
- Cross-platform: Android and Web from a single codebase
- Streaming chat UI with markdown rendering
- Nationality onboarding to personalize legal context
- Emergency mode with one-tap scripts and hotlines

**Data pipeline**
- Raw `.doc` Vietnamese legal files parsed via Word Binary Format piece table (CLX structure)
- Mixed encoding handling (UTF-16LE + CP1252) to eliminate extraction artifacts
- CSV chunk logs per collection for full traceability

---

## Challenges we ran into

- **Vietnamese legal document extraction**: Legacy `.doc` files store text in non-contiguous "pieces" with mixed encodings. Naive extraction produced CJK garbage characters. We had to implement a full Word Binary Format parser to correctly reconstruct the text.
- **Retrieval quality for Vietnamese law**: General-purpose embeddings performed poorly on legal Vietnamese. `BAAI/bge-m3` gave the best balance of multilingual accuracy without requiring fine-tuning.
- **Android build complexity**: Gradle plugin version conflicts, Java toolchain incompatibilities, and Expo SDK version mismatches required systematic debugging to resolve end-to-end.
- **Keeping answers legally accurate**: LLMs hallucinate fine amounts. We solved this by injecting authoritative law references directly into the system prompt and grounding every answer through RAG before generation.

---

## Accomplishments that we're proud of

- Built a full RAG pipeline over real Vietnamese government legislation — not summaries, not blog posts, the actual law
- Emergency scripts that give tourists the exact words to say, the exact fine to expect, and the exact hotline to call — in seconds
- Nationality-aware legal reasoning: the same question gets a different answer for a German tourist vs. an American tourist, because the law treats them differently
- End-to-end mobile app running natively on Android with voice output

---

## What we learned

- Legal RAG requires much stricter retrieval thresholds than general-purpose Q&A — a wrong answer about the law is worse than no answer
- Chunking strategy matters enormously: preserving the "Điều" (article) header as context in sub-chunks was critical for retrieval coherence
- Agentic tool routing (classifier → targeted collection → fallback to all collections) dramatically outperforms naive full-corpus search for domain-specific legal queries
- Mobile deployment has a long tail of environment issues; scripting the entire dev setup (`run-android.sh`) saved significant iteration time

---

## What's next for TripGuard

- **Expand to Southeast Asia**: Thailand, Indonesia, Bali — same architecture, new legal corpora
- **Offline mode**: Bundle a compressed vector index for use without internet in remote areas
- **Push alerts**: Notify users of regulation changes that affect their trip (visa policy updates, new drone rules)
- **Embassy integration**: Direct links to consular emergency contacts by nationality
- **Community Q&A**: Verified traveler reports layered on top of official legal data

---

## Built by Severance

| | |
|---|---|
| **Hoang Nguyen** | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/nhhg/) |
| **Nguyen Khang Le** | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/nguyenkhangle0135) |
| **Nguyen Thien An** | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ngthienaans/) |

