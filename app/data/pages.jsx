// Slideout page content ported from the most recent projecthoneycomb.site deploy.

import { TEAM, PARTNERS, ROSTER_EMAIL } from './team';

function Roster({ entries, empty }) {
  if (!entries.length) return <p className="roster-empty">{empty}</p>;
  return (
    <ul className="roster">
      {entries.map((e) => {
        const inner = (
          <>
            {e.logo && <img src={e.logo} alt="" />}
            <strong>{e.name}</strong>
            {e.role && <span>{e.role}</span>}
          </>
        );
        return (
          <li key={e.name}>
            {e.url
              ? <a href={e.url} target="_blank" rel="noreferrer">{inner}</a>
              : <div>{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export const PAGES = [
  {
    id: 'explore',
    eyebrow: 'WELCOME TO HONEYCOMB-PHENOMENON',
    title: 'A living archive of the unexplained',
    body: ({ focusSearch }) => (
      <>
        <button className="story-action" type="button" onClick={focusSearch}>
          SEARCH THE ARCHIVE <span aria-hidden="true">→</span>
        </button>
        <p style={{ marginTop: 18 }}>Search by place, year, encounter type, or any other details or key terms. Stories matching your search information will gather and those not relevant to your query will move away.</p>
        <h2>Your Experience. Our Collective History.</h2>
        <p>Honeycomb is an archive, a compendium of encounters built as a searchable database to facilitate learning, community, and growth. We understand that inexplicable does not mean impossible, and we want to create a trusted space for sharing these extraordinary events.</p>
        <p>Our platform will evolve over time, as contributions are made by you. By providing the platform, we hope to encourage the formation of a trusted community, where together we can work to untangle the meaning behind contact.</p>
        <p>For too long stigma and secrecy have caused us to keep these profound encounters to ourselves, often hiding them from even our closest loved ones.</p>
        <p className="declaration">We are here to change that.</p>
      </>
    ),
  },
  {
    id: 'stories',
    eyebrow: '',
    title: 'Your story belongs here',
    body: ({ openRecorder }) => (
      <>
        <p>At Honeycomb, we are documenting these interactions to build a visual, searchable database. Here, you can safely record your story, archive your encounter, search and view other encounters, and connect with a global community of people with similar yet personal experiences.</p>
        <p>This is our path to disclosure. This information belongs to all of us. No one can classify or hide your story&mdash;and your experience might just be another key, unlocking humanity&rsquo;s understanding of our place in the universe.</p>
        <h2>Join the Journey</h2>
        <p>We are building this archive with you. One person at a time. One experience at a time.</p>
        <button className="story-action" type="button" onClick={openRecorder}>
          SHARE YOUR STORY TODAY <span aria-hidden="true">→</span>
        </button>
      </>
    ),
  },
  // the team and advisors have a page of their own (app/about)
  { id: 'about', href: '/about', label: 'ABOUT THE TEAM' },
  {
    id: 'partners',
    eyebrow: 'WORKING ALONGSIDE US',
    title: 'Partners',
    body: () => (
      <>
        <p>Honeycomb is built with organizations that share the work: archives that preserve what is recorded here, research groups that study it with care, and community projects that help experiencers find each other.</p>
        <p>A partner is a group we work with directly &mdash; sharing what we learn, pointing people to one another, and keeping every experience in the hands of the person who lived it.</p>
        <Roster entries={PARTNERS} empty="The first partners are being confirmed. They will be listed here as they come on board." />
        <h2>Work with Honeycomb</h2>
        <p>If your organization records, studies, or supports anomalous experience and wants to work with us, we would like to hear from you.</p>
        <a className="story-action" href={`mailto:${ROSTER_EMAIL}?subject=Partnering%20with%20Honeycomb`}>
          PARTNER WITH HONEYCOMB <span aria-hidden="true">→</span>
        </a>
      </>
    ),
  },
  {
    id: 'contact',
    eyebrow: 'ADD YOUR VOICE',
    title: 'Contact Honeycomb',
    body: () => (
      <>
        <div className="contact-list">
          {TEAM.filter((m) => m.email).map(({ name, email }) => (
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
