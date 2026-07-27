# 🐝 Project Honeycomb

A safe, searchable living archive for anomalous human experiences, built one voice at a time.

**Live site:** [projecthoneycomb.site](https://www.projecthoneycomb.site)

---

## 🌟 About the Project

Project Honeycomb is an open-source initiative designed to provide a secure, private, and stigma-free platform for individuals to document and share anomalous experiences (UAP sightings, high strangeness, and unexplained phenomena). 

The goal of this project is to create a collective history, allowing experiencers to dictate or record their stories seamlessly while maintaining complete control over their privacy.

### Core Principles
- **Privacy First:** All submissions default to private. No one's story is published without explicit consent.
- **Accessible Design:** A warm, inviting, and highly polished interface that feels premium and safe.
- **Multi-Modal Intake:** Users can submit their experiences via text, audio dictation, or direct video recording.

---

## 🛠 Tech Stack & Architecture

This project is built for speed, security, and scale:

- **Framework:** Next.js 16 (App Router) powered by [vinext](https://github.com/cloudflare/vinext)
- **Styling:** Vanilla CSS with custom design tokens for a unique, modern aesthetic
- **Media Storage:** Cloudflare R2 via presigned URLs for large, direct-to-cloud video uploads
- **Security & Bot Protection:** [Arcjet](https://arcjet.com) (WAF, Rate Limiting, Bot Detection)
- **Error Tracking:** [Sentry](https://sentry.io)
- **Database (Upcoming):** Cloudflare D1 + Drizzle ORM
- **Hosting & CI/CD:** Netlify

---

## 🚀 Getting Started (Developers)

We welcome contributions! The easiest way to contribute to Project Honeycomb is to use GitHub Codespaces, which requires zero local setup.

### The Cloud Workflow (Recommended)
1. Fork or clone this repository.
2. Click **Code → Codespaces → Create codespace on main**.
3. Once the environment loads, run: `npm run dev`
4. Edit code in the browser-based VS Code.

### The Local Workflow
1. Clone the repo: `git clone https://github.com/rtfxdesign/honeycomb-phenomenon.git`
2. Install dependencies: `npm install` *(Requires Node ≥22.13.0)*
3. Start the dev server: `npm run dev`
4. Build for production: `npm run build`

---

## 🤝 Contributing Experiences

While the codebase itself is maintained internally, the project is fueled entirely by the community sharing their experiences. 

If you have a story to tell, we welcome your contribution directly through the platform. Head over to [projecthoneycomb.site](https://www.projecthoneycomb.site) and click "Share your experience" to safely and securely add your voice to the archive.

## 📄 License

This project is open source. 
