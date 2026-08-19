// Slideout page content ported from the most recent projecthoneycomb.site deploy.

const TEAM = [
  {
    name: 'Paul Werenko',
    image: '/team/paul-werenko.png',
    imagePosition: '50% 42%',
    text: 'Paul Werenko is the visionary behind Honeycomb. Following a lifetime of personal anomalous experiences which he previously dismissed as coincidences, Paul’s comprehension of the phenomenon began to shift, thanks in no small part to Leslie Kean’s 2017 NYT article and subsequent disclosures from trusted individuals. He has since dedicated his time and effort to numerous projects and organizations to assist in the education of all in the phenomena and their impact on humanity. Honeycomb is just one of those projects that is today his life’s work but it has become his flagship vision. Alongside his handpicked team (below) and with the tireless support of well-known members of the UAP Community including journalists, pilots, and Experiencers, Paul and his team are committed to providing a platform where every individual in the world is able to share their story.',
  },
  {
    name: 'Eavie Arntzen',
    image: '/team/eavie-arntzen.png',
    imagePosition: '58% 48%',
    text: 'With a lifelong fascination in the question of consciousness and a background in psychology and writing, Eavie Arntzen is deeply invested in the exploration of consciousness and, thanks to the disclosure of brave individuals committed to telling and sharing the truth, the connections between what it means to be conscious and the profound experience of unexplained phenomena. The single most engaging, fundamental and philosophical questions about our species and our universe are being asked today, and through the work of Honeycomb she is excited to direct those questions through a deeply human lens by supporting experiencers in telling their stories.',
  },
  {
    name: 'James Faulk',
    image: '/team/james-faulk.png',
    imagePosition: '50% 42%',
    text: 'In late 2022, award-winning reporter, writer, producer, news anchor and podcaster James Faulk launched Neon Galactic podcast to help mainstream the vital conversation surrounding UAP, NHI, and government secrecy. His work there triggered a deep dive into esoteric philosophy and other forms of rejected knowledge, prompting an ontological flip that impacted every aspect of his life. The rather impromptu online side gig became his primary passion, an engine for self-discovery, and a means to foster connection. His newest venture with Honeycomb is a perfect crystallization of the values and perspective he has developed these past several years and he is thrilled to help uncover the truth about humankind, consciousness, and unity in the cosmos, all of which James believes can be found in people’s lived experience. The goal now is to help people tell their stories.',
  },
  {
    name: 'Liz Perez',
    image: '/team/liz-perez.png',
    imagePosition: '50% 43%',
    text: 'Liz Perez’s personal experiences with the anomalous span the breadth of her life but have been refocused with her more recent research into the phenomenon. As a project manager for a high-end, complex and demanding engineering and construction firm, Liz provides the scaffolding of the Honeycomb project, keeping an eye on the next step and jumping in by making new ideas tangible. Her involvement in various projects related to the phenomena led her to a central role in Honeycomb and a commitment to disclosure and realizing the goal of making the once-sidelined truth accessible.',
  },
  {
    name: 'Dane Street',
    image: '/team/dane-street.png',
    imagePosition: '50% 42%',
    text: 'Driven by the idea of aiding connection and expansion of the human story within the phenomenon, Dane Street brings to Honeycomb a passion for shifting the paradigm and creating a platform through which disclosure will happen, not by way of appeals to repeal government secrecy, but by the people and for the people. Analytical by nature, his skill set as a logic and process analyst directs Dane’s exploration into the unexplainable and the as-yet-unrealized possibilities of human knowledge and understanding. Through population-based disclosure, Dane intends to return the truth to humanity and open the door to our shared history.',
  },
];

export const PAGES = [
  {
    id: 'explore',
    eyebrow: 'WELCOME TO HONEYCOMB-PHENOMENON',
    title: 'A living archive of the unexplained',
    body: () => (
      <>
        <h2>Your Experience. Our Collective History.</h2>
        <p>Honeycomb&rsquo;s mission is to support and empower those who have experienced or witnessed a UFO, UAP, or anything related to the Phenomenon, through the building of community, and the curation of shared experiences.</p>
        <p>We have built an ever-evolving platform to share anomalous experiences with others, one that fosters a new understanding that your experience was unique but not isolated. You are not alone.</p>
        <p>For too long stigma and secrecy have caused us to keep these profound encounters to ourselves, often hiding them from even our closest loved ones.</p>
        <p className="declaration">We are here to change that.</p>
      </>
    ),
  },
  {
    id: 'stories',
    eyebrow: 'EVERY EXPERIENCE IS A POINT OF LIGHT',
    title: 'Your story belongs here',
    body: ({ openRecorder }) => (
      <>
        <p>Over the past decade, we have been documenting these interactions to build a visual, searchable database. Here, you can safely record your story, archive your encounter, search and view other encounters, and connect with a global community of people with similar yet personal experiences.</p>
        <p>This is our path to disclosure. This information belongs to all of us. No one can classify or hide your story&mdash;and your experience might just be another key, unlocking humanity&rsquo;s understanding of our place in the universe.</p>
        <h2>Join the Journey</h2>
        <p>We are building this archive with you. One person at a time. One experience at a time.</p>
        <button className="story-action" type="button" onClick={openRecorder}>
          SHARE YOUR STORY TODAY <span aria-hidden="true">→</span>
        </button>
      </>
    ),
  },
  {
    id: 'about',
    eyebrow: 'ABOUT US',
    title: 'About Us',
    body: () => (
      <div className="bios">
        {TEAM.map((member, i) => (
          <article className={i % 2 ? 'bio bio--reverse' : 'bio'} key={member.name}>
            <div className="bio-portrait">
              <img src={member.image} alt={member.name} style={{ objectPosition: member.imagePosition }} />
            </div>
            <div className="bio-copy">
              <h2>{member.name}</h2>
              <p>{member.text}</p>
            </div>
          </article>
        ))}
      </div>
    ),
  },
  {
    id: 'contact',
    eyebrow: 'ADD YOUR VOICE',
    title: 'Contact Honeycomb',
    body: () => (
      <>
        <div className="contact-list">
          {[
            ['Paul Werenko', 'paul@honeycomb-phenomenon.com'],
            ['Eavie Arntzen', 'eavie@honeycomb-phenomenon.com'],
            ['James Faulk', 'james@honeycomb-phenomenon.com'],
            ['Liz Perez', 'liz@honeycomb-phenomenon.com'],
            ['Dane Street', 'dane@honeycomb-phenomenon.com'],
          ].map(([name, email]) => (
            <a href={`mailto:${email}`} key={email}>
              <strong>{name}</strong>
              <span>{email}</span>
            </a>
          ))}
        </div>
        <p>Prefer to remain anonymous? Send us your thoughts through this survey.</p>
        <a
          className="story-action"
          href="https://docs.google.com/forms/d/e/1FAIpQLScDWZob1StG3CvnBaTTl0dpm9DT8zqGAsOTa0kELwqZe7EJYg/viewform?usp=publish-editor"
          target="_blank"
          rel="noreferrer"
        >
          OPEN THE ANONYMOUS SURVEY <span aria-hidden="true">→</span>
        </a>
      </>
    ),
  },
];
