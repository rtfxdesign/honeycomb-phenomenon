// Slideout page content ported from the most recent projecthoneycomb.site deploy.

import { TEAM, PARTNERS, ADVISORS, ALLIES, ROSTER_EMAIL, ADVISOR_NOTE } from './team';

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
        <p style={{ marginTop: 18 }}>Search by place, year, encounter type, or any detail you remember — matching voices gather together in the comb and the rest give way.</p>
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
  // the team, advisors and allies have a page of their own (app/about)
  { id: 'about', href: '/about' },
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
    id: 'allies',
    eyebrow: 'STANDING WITH EXPERIENCERS',
    title: 'Allies',
    body: () => (
      <>
        <p>An ally is anyone who has lent Honeycomb a voice, a platform, or their time so that no one has to carry an encounter alone: journalists, pilots, researchers, podcasters, and experiencers who have chosen to speak.</p>
        <p>They do not run the archive and they do not see anything the public cannot. What they give is reach, credibility, and the simple fact of standing beside people who were once told to stay quiet.</p>
        <h2>Advisors</h2>
        <p>{ADVISOR_NOTE}</p>
        <Roster entries={ADVISORS} empty="" />
        <h2>Allies</h2>
        <Roster entries={ALLIES} empty="Our allies are being gathered with their permission. They will be named here once they have agreed to it." />
        <h2>Stand with us</h2>
        <p>If you want to add your name, your show, or your community to this list, write to us.</p>
        <a className="story-action" href={`mailto:${ROSTER_EMAIL}?subject=Standing%20with%20Honeycomb`}>
          BECOME AN ALLY <span aria-hidden="true">→</span>
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
