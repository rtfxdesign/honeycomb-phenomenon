/**
 * Test archive for the preview environment. Fiction — every name, place, and
 * account here is invented, and none of it may reach the live archive.
 *
 * Two things this data has to do that the first pass did not:
 *
 *   1. Transcripts are long. Real submissions are dictated, and dictated
 *      accounts run several hundred words with digressions and corrections in
 *      them. Two-sentence samples made the story panel look like a caption.
 *
 *   2. Tags come from a controlled vocabulary. Clustering can only draw two
 *      voices together when they share a tag, so a field of one-off tags
 *      produces no clustering at all — which is exactly what the first pass
 *      had: 79 tags across 24 stories, 63 of them used exactly once. Here every
 *      tag lands on at least three stories, and the vocabulary is grouped so
 *      the comb gathers along lines a reader can recognise.
 */

// The vocabulary, grouped by what each tag is about. Exported so the review
// dashboard can offer it as suggestions rather than free text.
export const TAG_VOCABULARY = {
  phenomenon: ['orb', 'triangle', 'disc', 'formation', 'humanoid', 'presence', 'apparition'],
  sensory: ['silent', 'hum', 'static', 'cold', 'pressure'],
  effects: ['radio-failure', 'engine-stall', 'ground-trace', 'animal-reaction', 'electrical'],
  setting: ['highway', 'farm', 'water', 'forest', 'desert', 'urban', 'coastal', 'mountain'],
  time: ['night', 'dawn', 'daytime', 'dusk', 'winter'],
  witness: ['family', 'children', 'childhood', 'multiple-witness', 'solitary', 'generational', 'military'],
  aftermath: ['missing-time', 'memory-gap', 'dreams-after', 'drawing', 'never-told', 'telepathy'],
};

export const ALL_TAGS = Object.values(TAG_VOCABULARY).flat();

export const STORIES = [
  {
    name: 'Marcy Ruiz', title: 'A silent light above the pines', location: 'Hudson Valley, NY', year: '1986', type: 'Light',
    tags: ['orb', 'silent', 'forest', 'night', 'childhood', 'family', 'never-told'], audio: '00-marcy-ruiz.mp3', portrait: true,
    text: `It held perfectly still over the treeline for what must have been four or five minutes. Then it moved without crossing the space between — it was in one place, and then it was in another place, and there was no travel in between that my eye could follow.

The silence is the part I have never been able to explain to anyone. We lived under a flight path. I knew what aircraft sounded like at that distance, and I knew what the woods sounded like at night, and this was neither. It was the absence of both. Even the frogs stopped.

My brother saw it too. He was nine and I was twelve. We went inside and got into our beds and did not say a word about it, and then we did not say a word about it for thirty years. When I finally brought it up at our mother's funeral he finished my sentence for me. He had been carrying the same picture the whole time.`,
  },
  {
    name: 'Jonah Ellery', title: 'Three points over the water', location: 'Lake Erie, OH', year: '2004', type: 'Craft',
    tags: ['triangle', 'formation', 'water', 'silent', 'multiple-witness'], audio: '01-jonah-ellery.mp3', portrait: true,
    text: `The lights formed a triangle, but the stars went out behind it. That is how I knew it was one solid object and not three separate craft flying in formation. I could trace the edge of it by which stars were missing.

There were four of us on the breakwall that night. We had been fishing since before dark. Nobody said anything for the first minute — I think we were all waiting for someone else to say it first, so we would know we were not the only one seeing it.

It drifted west across the lake, slow, at maybe the speed of a boat. Four minutes, give or take. Then it was simply not there. Not gone over the horizon, not faded — the stars came back all at once, the way a light goes off.

My friend Dev started laughing, which I have thought about a great deal since. It was not a funny thing. I think laughing was just the only thing his body knew how to do with it.`,
  },
  {
    name: 'Ana Whitfield', title: 'The morning after', location: 'Sedona, AZ', year: '2018', type: 'Dream',
    tags: ['presence', 'desert', 'dreams-after', 'memory-gap', 'solitary', 'telepathy'], audio: '02-ana-whitfield.mp3',
    text: `I woke with a memory that behaved like a place I had visited rather than anything my mind had made. I know the difference. Dreams thin out when you reach for them. This did the opposite — it got more detailed the longer I sat with it.

There was a room with no corners. Not round, exactly; the walls met, but the meeting did not produce a corner, and I remember being interested in that rather than frightened by it. And there was someone waiting, patiently, for me to understand something. Not speaking. Waiting the way a teacher waits when they have already given you everything you need.

I never did understand it. That is the part that has stayed with me — not the strangeness, but the sense of having been shown something carefully and having failed to take it in. I have had ordinary dreams about the room since, and I can tell those apart from the first one immediately.`,
  },
  {
    name: 'Dell Emerson', title: 'No sound on the county road', location: 'Taos, NM', year: '1997', type: 'Craft',
    tags: ['radio-failure', 'engine-stall', 'highway', 'desert', 'silent'], audio: '03-dell-emerson.mp3', portrait: true,
    text: `The radio cut out before I saw anything. That order matters to me. I have gone over it many times and I am certain of it: first the radio, then the glow coming up over the ridge.

The truck kept running. That is the strange part — the engine was fine, I had headlights, but every electrical thing that made noise went dead quiet at once. The radio, the heater fan, the little chime that never stopped telling me the passenger belt was undone. All of it, together, like someone had put a hand over the whole system.

I pulled onto the shoulder because I did not trust myself to drive. The glow passed north of me. I would not call it a craft because I could not see a shape, only that the light had an edge to it, and the edge was hard rather than soft the way a cloud of light would be.

When it was gone the radio came back mid-song. Not from the start of a song — mid-song, at the point it would have reached if it had been playing the whole time. I sat there until the song ended.`,
  },
  {
    name: 'Kit Sorenson', title: 'A shape inside the cloud', location: 'Portland, OR', year: '2021', type: 'Other',
    tags: ['daytime', 'urban', 'presence', 'drawing'],
    text: `The cloud changed around something that never became fully visible. I want to be careful here, because I am aware of how this sounds: I did not see an object. I saw what the vapour did, the way you can see wind by what it moves.

It was a flat grey afternoon, the kind we get for months. I was on the back step with a coffee. The cloud layer was low and even, and then a section of it began to move differently from the rest — turning in on itself, in a way that had a centre.

It stayed about twenty minutes. Long enough that I went inside, got a pencil, and drew it, which I have never done before or since about anything. I still have the drawing. It is not a good drawing but it is an honest one, and it shows a hollow rather than a thing, which is exactly right.`,
  },
  {
    name: 'Rosa Calder', title: 'My grandmother saw it too', location: 'Marfa, TX', year: '1973', type: 'Light',
    tags: ['orb', 'desert', 'family', 'generational', 'never-told', 'multiple-witness'], portrait: true,
    text: `We never spoke about it until thirty years later. When we finally did, our details matched exactly — the colour, the way it split into two and then back into one, the direction it went afterwards.

That was harder to sit with than the sighting itself. I had spent three decades gently deciding I had been a child with an imagination. Her account took that away from me in about ninety seconds.

She had done the same thing, it turned out. She had decided she had been a tired woman at the end of a long day. We had each been protecting the other from a thing we had both seen together.

My grandmother is gone now. What I have left is that ninety seconds at her kitchen table, and the fact that neither of us ever managed to explain it, and that she squeezed my hand at the end of it like we had finally set something down.`,
  },
  {
    name: 'Priya Anand', title: 'Eleven minutes missing', location: 'Allagash, ME', year: '1992', type: 'Presence',
    tags: ['missing-time', 'memory-gap', 'forest', 'night', 'multiple-witness', 'presence', 'dreams-after'], portrait: true,
    text: `Four of us checked our watches at the same moment, which is not a thing people usually do. We did it because the fire had gone from burning well to nearly out, and that does not happen in the time it takes to look up.

Eleven minutes. All four watches agreed with each other and disagreed with the fire, and with the sky, which had moved further than eleven minutes should have moved.

I do not have an account of what happened in those minutes and I am suspicious of anyone who claims to remember theirs in detail. What I have is the sensation of having been attended to. Not examined — attended to, the way you feel when someone is in the room behind you.

For about a year afterwards I dreamt about the lake at a low angle, as though from a few feet above the water. I do not swim, and I had never seen the lake from that position. Two of the others reported the same dream when I finally asked, and I had been very careful not to describe mine first.`,
  },
  {
    name: 'Tom Bright Water', title: 'The horses knew first', location: 'Pine Ridge, SD', year: '2009', type: 'Presence',
    tags: ['animal-reaction', 'farm', 'dusk', 'presence', 'solitary', 'cold'], portrait: true,
    text: `The horses knew a good ten minutes before I did. They came into the near corner of the paddock and stood in a line facing the same direction, which they do not do, and stayed there.

I went out because the silence bothered me. I have lived on this land my whole life and I know its evening sounds. There were none. No insects, and the wind was in the grass but the grass was not making the sound the grass makes.

Then the cold came through, and it was not weather cold. It came in a front, like walking from one room into another, and it passed over me and kept going toward the road.

The horses turned their heads to follow it. I stood there and watched them track a thing across the paddock that I could not see, and when they lost interest and went back to grazing, that was how I knew it had left.`,
  },
  {
    name: 'Marguerite Feld', title: 'Static on every channel', location: 'Green Bank, WV', year: '1988', type: 'Other',
    tags: ['static', 'radio-failure', 'electrical', 'mountain'],
    text: `I worked nights and I had the radio on the whole shift, every shift, for six years. I knew its moods — where it drifted, which channels went soft in bad weather.

This was not that. Every channel went to the same static at the same moment, and the static had a rhythm in it. Not a signal, I want to be clear, and not words. A rhythm. Something regular underneath the noise, the way you can hear a pump running in another part of a building.

It lasted a little under two hours. I wrote down the time it started because I assumed there would be an explanation in the morning and I wanted to be able to point at it.

There was no explanation in the morning. Nobody else on my shift had a radio on. I have never been able to close this one and I have stopped trying. What I would like is simply to know whether anyone else in that valley heard the same rhythm that night.`,
  },
  {
    name: 'Owen Hallmark', title: 'It followed the car for six miles', location: 'Barstow, CA', year: '2015', type: 'Light',
    tags: ['orb', 'highway', 'desert', 'family', 'children', 'never-told'],
    text: `My daughter noticed it first, and she was seven, and she said it very calmly: there is a light coming with us.

It held a fixed position off the passenger side, keeping pace, at what I would guess was a quarter mile out and slightly above us. I slowed down. It slowed down. I want to be honest that I then sped up quite a lot, and it matched that too, without appearing to accelerate — it simply remained in the same relationship to the car.

Six miles. I know because I watched the odometer rather than the light, which in hindsight is a strange choice, but I think I wanted a number I could hold onto afterwards.

Then it went out. My daughter asked whether it had gone home. I said yes. She is nineteen now and she remembers the whole thing and neither of us has ever told her mother.`,
  },
  {
    name: 'Frances Okoye', title: 'Something in the orchard rows', location: 'Yakima, WA', year: '2001', type: 'Humanoid',
    tags: ['humanoid', 'farm', 'dusk', 'animal-reaction', 'drawing'], portrait: true,
    text: `I saw a figure standing between two rows, four rows over from where I was working. Tall, and thin in a way that read wrong at that distance, and completely still.

I assumed it was one of the seasonal crew. I raised a hand. It did not respond, and the not-responding is what made me look properly, because everybody responds to a raised hand even if they do not know you.

The dog would not go down that row. She is a working dog and she goes everywhere. She stopped at the row entrance and stood with her weight back.

When I looked up again it was not there. I walked the row afterwards and the ground was dry and there was nothing to see. I drew it that night, the proportions of it, and I have kept the drawing in a drawer for twenty-odd years without showing it to anybody, because the proportions are the part nobody would let go of.`,
  },
  {
    name: 'Ruth Vanterpool', title: 'The hum under the harbour', location: 'Halifax, NS', year: '2011', type: 'Other',
    tags: ['hum', 'water', 'coastal', 'pressure'],
    text: `It came up through the stone of the pier and into the soles of your feet before you heard it in the air. That was consistent for everyone who felt it — you felt it first, then you heard it.

Low. Below what I would call a note. And it had pressure with it, the way a very large engine has pressure, so that your chest was involved in listening whether you wanted it to be.

Six of us were on the pier that night for various reasons and all six of us stopped what we were doing. A man I did not know asked, out loud, to nobody, whether it was a ship. It was not a ship. The harbour was clear, and I have heard every kind of ship this harbour gets.

It lasted about forty minutes and it stopped the way a held breath stops. I have looked into infrastructure and tides and everything else a sensible person would look into. I have not found it.`,
  },
  {
    name: 'Casey Lindqvist', title: 'Snow that fell around it', location: 'Duluth, MN', year: '1994', type: 'Craft',
    tags: ['disc', 'winter', 'water', 'silent', 'cold'],
    text: `The snow was coming down heavily and it was not landing on the object. It went around it — there was a shape in the snowfall where no snow was, about the size of a delivery truck, holding maybe thirty feet up.

I could not see the thing itself. I saw the hole it made in the weather. I have tried for thirty years to describe this to people and I have never got it right, so I will just say it plainly: the snow told me the shape of something that was not otherwise visible.

It was silent. In heavy snow everything is silent anyway, which I know weakens my account, and I have made my peace with that.

I watched for maybe two minutes and then I got cold and I went inside, and I have never forgiven myself for going inside. That is the honest ending. I got cold and I went in.`,
  },
  {
    name: 'Hector Salazar', title: 'A ring pressed into the field', location: 'Ord, NE', year: '2007', type: 'Other',
    tags: ['ground-trace', 'farm', 'dawn', 'daytime'], portrait: true,
    text: `I found it at first light doing the usual round. A ring in the wheat about forty feet across, and the wheat was not broken — it was bent, at the base, and it was still alive.

That is the detail that convinced my neighbour, who came out to laugh at me and then stopped laughing. Broken wheat is easy. Anyone can flatten wheat. Bent and living, all lying the same direction, at the same height off the ground, across forty feet of uneven land — I have farmed my whole life and I could not do that with a week and a crew.

It stayed visible for the rest of the season. The wheat inside the ring came in slightly shorter at harvest and I have the yield numbers to show it.

I did not report it to anyone and I would ask that this account not be used to invite people onto the land. I am putting it here because it happened and because I would like it written down somewhere by me rather than by somebody else.`,
  },
  {
    name: 'Nell Cotter', title: 'My son drew it before he told me', location: 'Asheville, NC', year: '2013', type: 'Presence',
    tags: ['children', 'drawing', 'family', 'presence', 'mountain', 'dreams-after', 'telepathy'],
    text: `He was five. He drew the same figure eleven times over about three weeks before he ever said anything to me about it, and I only counted them later, going back through the pile.

The figure is at the window every time. Not in the room — at the window, and always on the right-hand side of the page, and always with the same proportions, which for a five-year-old drawing from imagination is not what you would expect. Children's drawings drift.

When he finally told me, he was not frightened. He told me the way he would tell me about a neighbour. He said it came when he was nearly asleep and that it was sad, and I asked how he knew it was sad and he said because it told him, and I asked whether it talked and he said no.

He is eighteen now and remembers drawing but not the figure. I have kept all eleven. I am not claiming anything about what it was. I am saying an adult would have found it very difficult to produce eleven drawings that consistent, and he was five, and he did it before he said a word.`,
  },
  {
    name: 'Aiko Tanaka', title: 'The light over the rice terraces', location: 'Nagano, Japan', year: '1979', type: 'Light',
    tags: ['orb', 'farm', 'dusk', 'generational', 'family', 'multiple-witness'], portrait: true,
    text: `My grandmother called it by a name that was not a word for a light. It was the name she used, and her mother had used it, and when I asked what it meant she said it meant the one that comes back.

It came at dusk in the weeks after the water went into the terraces, and it moved along the contour lines rather than in a straight line, which is what has always struck me. It followed the shape of the land at a fixed height above it.

The village was not frightened of it. That is what I most want recorded. I have read a great deal of writing about these things since and almost all of it is frightened, and my experience was of a community that had a name for something and had folded it into the year.

I saw it four times as a child and once as an adult, in 1979, on a visit home. It went along the terraces the same way it always had and I stood in the road and cried, which surprised me.`,
  },
  {
    name: 'Gerald Mbeki', title: 'Schoolyard, mid-morning', location: 'Ruwa, Zimbabwe', year: '1994', type: 'Craft',
    tags: ['daytime', 'children', 'multiple-witness', 'disc', 'humanoid', 'drawing'],
    text: `There were a great many of us and we were not all standing in the same place, and that has always seemed to me the most useful thing about it. We saw it from different angles and afterwards our drawings did not match in the way copied drawings match.

It was mid-morning. Bright. Nobody had been telling ghost stories; we were playing.

I was among the further group and what I saw was the object and a shape near it that I would not describe as a person but which moved as a person moves. Others closer say more than that. I am only going to say what I can hold to.

We were asked to draw it separately and I remember the adults being very careful to keep us apart while we did, which even at the time I recognised as fair. The drawings agree about the object and disagree about the details around it. That is what a real thing looks like when many children see it, and I have never had a good answer for anybody who says otherwise.`,
  },
  {
    name: 'Bea Ferreira', title: 'Off the coast, from the wheelhouse', location: 'Nazaré, Portugal', year: '2016', type: 'Light',
    tags: ['orb', 'water', 'coastal', 'night', 'silent', 'solitary', 'radio-failure'], portrait: true,
    text: `I was alone in the wheelhouse on a flat night, six miles out. The radio had been quiet for an hour, which is normal at that time, so I cannot claim it failed — only that when I tried to use it, it did not work, and that was after.

Three lights came up out of the water off the starboard bow. Out of it — I was watching that patch of water because there was a disturbance on it, and the lights came up through the surface and kept going.

There was no sound and no wake and no spray. Water does not let a thing leave it quietly. That is the whole of my objection to every explanation I have been offered since.

I have fished this coast for twenty-six years. I know aircraft, I know flares, I know what other boats do at night, and I know what the water does on its own. I am not saying what it was. I am saying I have eliminated the things I am qualified to eliminate.`,
  },
  {
    name: 'Sam Odell', title: 'Engine died on the overpass', location: 'Chicago, IL', year: '2019', type: 'Craft',
    tags: ['engine-stall', 'electrical', 'highway', 'urban', 'multiple-witness', 'triangle'],
    text: `Traffic stopped because the cars stopped. Not brake lights — engines. Mine went, and the one ahead of me went, and by the time I was out of the car there were maybe fifteen vehicles dead on the overpass with people standing beside them.

That is the part I would ask anyone to look into, because it is checkable. Fifteen strangers, one stretch of road, same minute.

Above us and to the north there was a shape holding still, darker than the sky, with lights at the points of it that were not blinking in any pattern I associate with aircraft. It was not high. I have flown a great deal and I could not make it fit anything.

It left in a direction rather than by moving — it went, and the going took no time. Every car on that overpass started again within a minute of each other. A woman two cars up was crying. Nobody was talking much. We all got back in and drove, and I have thought about that every day since: that fifteen of us just drove away.`,
  },
  {
    name: 'Iris Nakamura', title: 'Cold in the upstairs hallway', location: 'Savannah, GA', year: '2005', type: 'Presence',
    tags: ['apparition', 'cold', 'presence', 'urban', 'family', 'never-told'],
    text: `The hallway was cold in one section, about the width of a doorway, and it did not move around the house the way a draught moves. It was in the same place for eleven years.

I want to be measured. Old houses are cold. But a draught has a source and this had none, and it had an edge you could step across, and children who did not know to expect it walked around it.

Twice I saw someone at the far end of that hallway. Both times in the small hours, both times only as I was turning away, and I am aware of exactly how much that is worth as testimony.

What I am more confident about is the dog, who would not use the hallway, and my mother, who visited once, and who asked me at breakfast without any prompting whether the upstairs had a cold spot. I had told her nothing. I had told nobody. That is why I am finally writing it down.`,
  },
  {
    name: 'Del Rutkowski', title: 'A disc over the ore docks', location: 'Ashtabula, OH', year: '1981', type: 'Craft',
    tags: ['disc', 'water', 'coastal', 'hum', 'military'], portrait: true,
    text: `I was on the night crew at the docks and there were eleven of us working when it came over. Eleven witnesses, all of us sober, all of us on shift and accounted for.

It came in low from the lake, and it was a disc — I am not going to soften that. Circular, with a raised section, and a band of lights around the widest part that were not flashing but were moving around the band.

There was a hum. Everyone remembers the hum differently, which I have come to think is honest rather than suspicious. To me it was like a transformer. To the foreman it was like a ship's engine room. To one of the young lads it was like a swarm.

Two of the men had done service and both said the same thing independently, which was that it was not ours. I have no way of assessing that. I put it in because they said it and because it seemed to cost them something to say.`,
  },
  {
    name: 'Winnie Achebe', title: 'The road that ran twice', location: 'Bakersfield, CA', year: '2010', type: 'Other',
    tags: ['missing-time', 'memory-gap', 'highway', 'dreams-after'],
    text: `I drove the same four miles of road twice, in sequence, without turning around. I know how that sounds and I have had a long time to find a better way to say it, and there is not one.

There is a particular sign, then a particular bend, then a particular closed fruit stand with a hand-painted sign. I passed all three. Then I passed all three again, in the same order, having driven straight the entire time.

The clock in the car did not account for the second pass. It showed less time than the drive should have taken, not more, which is the opposite of what people expect me to say and is the reason I have mostly kept quiet.

I do not have a theory. I have a knot. For about six months afterwards I dreamt of driving that road and being unable to reach the end of it, and those dreams were ordinary anxiety dreams and I could tell the difference, and that difference is the thing I most want somebody to take seriously.`,
  },
  {
    name: 'Peter Halloran', title: 'It rose from the treeline without sound', location: 'Killarney, Ireland', year: '1998', type: 'Craft',
    tags: ['triangle', 'forest', 'dusk', 'silent', 'never-told'],
    text: `It came up out of the trees rather than over them. I was on the hill above and looking down, so I had the unusual advantage of seeing it against the dark of the wood instead of against the sky.

Triangular, and larger than I have the confidence to estimate. When I try to give a size I find I am guessing from height, and I do not know the height, so the size is guesswork built on guesswork.

No sound at all, and this was a still evening in a quiet place with no road nearby. I have been on that hill hundreds of times before and since.

I told my wife and nobody else for eleven years. Not because I was afraid of being disbelieved — I am from a place where people are fairly relaxed about the uncanny — but because I could not find a way to tell it that did not sound like I was asking for something. I am not asking for anything. I would simply like it to be on a list somewhere.`,
  },
  {
    name: 'Delphine Marchand', title: 'The animals in the barn went quiet', location: 'Périgord, France', year: '1986', type: 'Presence',
    tags: ['animal-reaction', 'farm', 'night', 'presence', 'cold', 'solitary', 'pressure'],
    text: `Sixty animals went quiet at once. If you have never been in a barn at night you may not understand that a barn is never silent — there is always shifting, always breathing, always someone awake.

All of it stopped, together, and stayed stopped for a length of time I would put at two or three minutes but could not swear to.

There was pressure with it. In the ears, the way it is on a mountain road, and a cold that came in low across the floor. I stood in the middle of the barn with a torch and I did not turn it on, and I have never been able to explain to myself why I did not turn it on.

Then everything started again at once. Not gradually — sixty animals resumed at the same instant, as though a piece of music had come back in. I sat down on a bale and stayed there until it was light.`,
  },
  {
    name: 'Marcus Vane', title: 'Formation over the base fence', location: 'Rachel, NV', year: '2003', type: 'Light',
    tags: ['formation', 'orb', 'desert', 'night', 'military', 'multiple-witness', 'silent'],
    text: `Nine lights in three rows of three, holding a formation so exact it read as artificial from the first second. They did not drift relative to one another at all, which aircraft in formation do, constantly.

I have watched a lot of aircraft in that part of the world, deliberately, for years. I am not a casual observer and I am not an excitable one. I have talked myself out of a dozen sightings before this one.

The formation held for about six minutes. Then the three rows separated, each row going a different way, at a speed I will not put a number on because any number I give will be the thing people argue about instead of the event.

There were maybe twenty of us out there and everyone saw it. I would not describe the mood afterwards as excited. It was subdued. When you get what you have been waiting years for, and it does not resolve anything, it turns out to be quite a heavy thing to be handed.`,
  },
  {
    name: 'Lila Barros', title: 'The child at the end of the dock', location: 'Cedar Key, FL', year: '1990', type: 'Apparition',
    tags: ['apparition', 'water', 'coastal', 'dawn', 'children', 'solitary', 'never-told'],
    text: `There was a child at the end of the dock at first light, and there should not have been, and when I had walked half its length there was not.

I was nineteen and working early shifts and I was not tired in the way that produces things. I have used tiredness as an explanation for other events in my life and I know what it feels like from the inside.

The dock is a hundred and forty feet and it has no branches and no ladder and the water on both sides is shallow and clear. There was nowhere to have gone.

I have never called it a ghost, because I do not know that it was, and the word brings a whole apparatus with it that I do not want. What I will say is that I was not frightened at the time and I became frightened about an hour later, which people who have had experiences tell me is very common and which nobody warns you about.`,
  },
  {
    name: 'Anders Holm', title: 'Green light under the ice', location: 'Abisko, Sweden', year: '2012', type: 'Light',
    tags: ['winter', 'water', 'orb', 'cold', 'multiple-witness', 'silent'],
    text: `A green light moved under the ice of the lake, beneath us, at a depth I could not judge. We were four, walking out to a hut, and we all stopped at the same moment.

It travelled along under the ice in a line that took it away from us, then curved, and came back, and passed under our feet a second time. That second pass is why none of us has ever been able to file it away as a reflection. A reflection does not come back for another look.

The aurora was out and I know precisely how that sounds. But the aurora was above and this was below, and the ice was a metre thick, and the light was distinct and small and had an edge.

We did not run. It seems to me now that we should have run, or at least that a sensible person would have. We stood in a line and watched a light take an interest in us and then leave, and afterwards we walked to the hut and made food and did not speak about it until the morning.`,
  },
  {
    name: 'Corine Duplessis', title: 'It was in the room when I woke', location: 'Baton Rouge, LA', year: '2000', type: 'Presence',
    tags: ['presence', 'humanoid', 'pressure', 'solitary', 'dreams-after', 'memory-gap'],
    text: `I woke because something was in the room, not the other way around. I have been very careful with that sentence for twenty-five years.

I could not move, and I know exactly what sleep paralysis is — I have had it since, several times, and I can tell you it is not the same and I would not confuse the two. In sleep paralysis I am frightened of the room. That night the room was ordinary and the thing in it was not.

Tall, at the foot of the bed, and my strongest impression was of patience. It was not doing anything. It was there in the way that furniture is there.

I lost some time. There is a gap between that and the next thing I remember, which is being able to move and the window being grey. For about two years afterwards I had a recurring dream of a corridor with a soft floor, and I have never been able to attach that dream to anything in my life.`,
  },
  {
    name: 'Reg Whitcombe', title: 'Two of them on the moor', location: 'North York Moors, UK', year: '1977', type: 'Humanoid',
    tags: ['humanoid', 'mountain', 'dusk', 'multiple-witness', 'ground-trace', 'never-told'], portrait: true,
    text: `Two figures on the ridge, walking in step. That is what caught me — not their shape but their gait. People walking together fall in and out of step. These did not.

We were two, myself and my brother-in-law, out later than we had meant to be. We had a good view along the ridge for perhaps half a mile.

They were too far off to describe faces and I will not invent any. Height I would put as tall, but everything on a moor at dusk is a guess.

Where we lost sight of them, the heather was pressed in two parallel tracks that we found the next morning when we went back up in the light, and there were no boot marks in the soft ground either side. My brother-in-law was a practical man who had no time for any of this, and he went quiet on that ridge and stayed quiet about it for the rest of his life.`,
  },
  {
    name: 'Sunny Ferrell', title: 'Every clock in the house', location: 'Boise, ID', year: '2017', type: 'Other',
    tags: ['electrical', 'urban', 'family', 'multiple-witness', 'missing-time'],
    text: `Every clock in the house was nineteen minutes slow the following morning. The oven, the microwave, the bedside radio, my car in the drive, and both our phones — which do not run on the house supply and should not have been able to do that.

The power had not gone out. Nothing had reset to a blinking zero, which is what happens here when we lose supply, and we lose supply often enough that I know the pattern.

Nineteen minutes, on everything, including two devices that get their time from a network. My husband checked and rechecked because he did not believe me, and then he stopped talking and sat down.

I have no light in the sky to offer and no sound and no figure. I have a household of clocks that lost the same nineteen minutes together, and I put it here because I have read enough of these accounts now to know that the small strange thing sometimes matters to somebody working on the pattern.`,
  },
  {
    name: 'Yusuf Kaya', title: 'Above the ferry, both crossings', location: 'İzmir, Türkiye', year: '2008', type: 'Light',
    tags: ['orb', 'water', 'coastal', 'dusk', 'daytime'],
    text: `I took the same ferry twice a day for nine years, so I am well placed to say what is normal in that piece of sky.

On the evening crossing there was a light holding a fixed position over the water ahead of us, and the ferry passed beneath it, and it did not move. On the return crossing ninety minutes later it was in exactly the same place.

Several passengers were photographing it and I have no idea what became of those photographs. This was before everybody's photographs went to the same few places automatically.

What I want to record is not that I saw a light — people see lights. It is that it was in an identical position an hour and a half apart, over water, with a wind blowing, and that a boat full of ordinary commuters looked up at it twice and then went back to their evening.`,
  },
  {
    name: 'Etta Boone', title: 'The field behind the church', location: 'Hazard, KY', year: '1969', type: 'Light',
    tags: ['orb', 'farm', 'generational', 'family', 'childhood', 'never-told'],
    text: `I was eleven and it was the summer my father was ill, and I have wondered ever since whether that is why I was outside at that hour and why I have held on to it so tightly.

A light came down into the field behind the church, slowly, and rested a few feet above the ground, and stayed. It was the colour of a lamp seen through a curtain — warmer than a star, softer than a headlight.

I was not afraid of it. I have talked to enough people now to know how unusual that is, and I have no explanation for it other than that I was eleven and it did not seem to be about me.

I watched until it went up again. I told my mother and she told me not to tell my father, and that instruction shaped the next fifty years of my silence about it. She never said she did not believe me. She said not to tell him. I have thought about the difference between those two things for most of my life.`,
  },
  {
    name: 'Nadia Petrov', title: 'Instruments spun in the cockpit', location: 'Anchorage, AK', year: '1996', type: 'Craft',
    tags: ['electrical', 'radio-failure', 'formation', 'daytime', 'multiple-witness', 'military', 'mountain'], portrait: true,
    text: `The compass went round continuously, not swinging but rotating, at about the speed of a second hand. Both of us in the cockpit watched it do that for close to a minute.

We had three lights off the port side in a line that held its spacing while we changed heading, which is the thing that has stayed with me professionally. Objects that keep station with you through a turn are doing something deliberate.

Radio was unusable for the duration. Not silent — occupied. There was something in the channel that was not speech and not the usual noise.

I filed a report at the time through the appropriate channel and I never heard anything back about it, which I want to state neutrally: I do not know that it means anything. I have flown for thirty-one years, most of them since this happened, and this is the only entry of its kind in my logbook.`,
  },
  {
    name: 'Barnaby Osei', title: 'A hum with no source in the plant', location: 'Sheffield, UK', year: '2014', type: 'Other',
    tags: ['hum', 'urban', 'electrical', 'pressure'],
    text: `We shut the line down to find it. That is how seriously we took it, and how confident I am that it was not the plant: a night shift stood idle for two hours while four of us walked the building with the machinery off.

The hum continued with the plant silent. It was in the structure and it was in the air and it had pressure to it that you felt across the chest.

We checked substations, we checked the pumps, we checked the road outside, and we checked with the works next door, who had heard nothing at all, which is the detail I find hardest.

It stopped at about four in the morning. The log for that night exists and records the shutdown and the reason for it in a supervisor's handwriting, and I have often thought that is a more useful artefact than my memory of it.`,
  },
  {
    name: 'Rosalind Ash', title: 'Beneath the surface at the quarry', location: 'Bodmin, UK', year: '1999', type: 'Light',
    tags: ['orb', 'water', 'daytime', 'silent', 'drawing'],
    text: `A light moved beneath the water of the flooded quarry on a bright afternoon, which is the wrong conditions for it and is why I trust it.

At night a light on water is nothing. At two in the afternoon in June, with the surface lit and the bottom visible for the first few metres, a light travelling below the surface is a different proposition.

It went from the near side to the far side in a straight line and it did not disturb the surface. No wake, no bulge, no bubbles.

I sketched the quarry that evening with the line of travel on it, because I wanted to be able to check the geometry against the shape of the pit later, and I did check it, and the line does not correspond to anything — no channel, no pipe, no run of old workings. I have the sketch. It is the only reason I have not talked myself out of the whole thing.`,
  },
  {
    name: 'Junie Falls', title: 'It knew when we looked at it', location: 'Bisbee, AZ', year: '2020', type: 'Light',
    tags: ['orb', 'desert', 'telepathy', 'multiple-witness', 'presence'],
    text: `It responded to attention. I understand what a claim that is, and we tested it, badly but genuinely, for about half an hour before we let ourselves say it out loud.

When all three of us looked at it directly, it dimmed. When we looked away and talked among ourselves, it brightened. We did this perhaps a dozen times, taking turns to be the one not looking, and it held.

I am aware of every objection. Averted vision is a real effect and I knew about it before that night. But averted vision does not explain the brightening happening when the last of us turned away, at the moment the last of us turned away.

The feeling was not of being watched. It was of being answered. My friend Dolores said afterwards that it had felt like a conversation conducted at the wrong speed, and that is as close as any of us has come.`,
  },
  {
    name: 'Piet van Doorn', title: 'The polder road at four in the morning', location: 'Flevoland, Netherlands', year: '2006', type: 'Craft',
    tags: ['disc', 'highway', 'dawn', 'engine-stall', 'solitary', 'ground-trace'],
    text: `The polder is flat and empty and you can see a very long way, which makes it good country for this kind of account and bad country for excuses.

My van cut out. I coasted to a stop. About two hundred metres ahead and to the left, low over a field, there was an object with a curved upper surface, dark, with no lights on it at all — I want to stress that, because everyone expects lights. There were none. I could see it because the sky behind it was already going grey.

It was there for perhaps ninety seconds and then it went up, without noise, and I lost it almost immediately against the cloud.

I walked into the field afterwards, which was foolish. There was a patch of about six metres where the crop was flattened outward from a centre, in a spiral, and the soil under it was dry when the rest of the field was wet with dew. I went back at midday and the dry patch was still visible.`,
  },
  {
    name: 'Constance Mbatha', title: 'My mother told me it would come back', location: 'Durban, South Africa', year: '1984', type: 'Light',
    tags: ['orb', 'coastal', 'night', 'generational', 'family', 'childhood', 'dreams-after'], portrait: true,
    text: `My mother told me about it before I ever saw it, which I now think is unusual — most people in these accounts are surprised.

She described it to me when I was small: a light that came in off the sea in the last weeks of winter, low, moving along the shore, and she said her grandmother had described the same thing to her in almost the same words.

I saw it in 1984 and it was as she had said. That is the whole of my testimony and I know it is a weak one, because I had been told what to expect and human beings are suggestible.

But I would put it beside the others anyway, because what I actually want to record is not the light. It is that three generations of women in my family have described the same phenomenon in the same place with the same season attached to it, and that we did not consider it remarkable enough to write down until now.`,
  },
  {
    name: 'Wallace Trent', title: 'Deer stood still in the headlights for four minutes', location: 'Bemidji, MN', year: '2002', type: 'Presence',
    tags: ['animal-reaction', 'forest', 'highway', 'solitary', 'presence', 'cold'],
    text: `Seven deer in the road, standing, not moving, for four minutes with my headlights on them. Deer do not do that. Deer freeze for a second or two and then they go.

I got out of the truck eventually, which anyone who knows deer will tell you should have scattered them instantly, and it did not. They were all facing the same direction, and it was not the direction of my truck. They were facing into the trees on the north side.

I stood in the road and looked where they were looking and I saw nothing at all, and I want to be honest about that: I have no object, no light, no figure to give you.

What I have is the cold that came out of that treeline and went past me, and seven animals that would not break their attention for a running engine and a shouting man, and then all of them going at once, together, back the way they had come.`,
  },
  {
    name: 'Adaeze Nwosu', title: 'The static answered back', location: 'Lagos, Nigeria', year: '2015', type: 'Other',
    tags: ['static', 'radio-failure', 'urban', 'telepathy'],
    text: `I had been listening to noise on an old set for weeks as a way of falling asleep, so I knew the texture of that noise very well.

One night there was structure in it. Not words and not music — intervals. Something that grouped, and paused, and grouped again, and the grouping was not regular in the way machinery is regular.

I did the thing that I imagine everybody does and I spoke to it, and I felt immediately ridiculous. There was a pause that was longer than the pauses had been. Then the grouping resumed differently.

I am not going to claim I had a conversation. I am going to claim that I have listened to a great deal of static, deliberately, before and since, and that I have never heard it change its behaviour after a pause in which somebody spoke.`,
  },
  {
    name: 'Fenella Drake', title: 'Three of us drew it separately', location: 'Hobart, Australia', year: '2011', type: 'Craft',
    tags: ['triangle', 'drawing', 'multiple-witness', 'mountain', 'silent'],
    text: `We agreed in the car park, before we had said anything to each other about what we had seen, that we would go home and draw it and not speak until the next day. I do not know which of us suggested it. It was a good instinct.

The three drawings agree about the shape, which is a triangle with the rear edge concave rather than straight. They agree about there being lights at two of the points and not the third, which is the detail I would have expected us to differ on.

They disagree about size and about how high it was, and they disagree quite badly, which I take as a mark in our favour rather than against us.

We have kept all three. My own is the worst of them. I would like them to go somewhere they can be compared with other people's rather than sit in a drawer, which is the entire reason I am submitting this.`,
  },
  {
    name: 'Bo Halvorsen', title: 'A shape that blocked the stars, moving south', location: 'Whitefish, MT', year: '1993', type: 'Craft',
    tags: ['triangle', 'mountain', 'night', 'silent', 'solitary', 'winter'],
    text: `I did not see an object. I saw stars go out in a shape and come back, and the shape moved south at a walking pace.

It was cold and clear and the sky was as good as it gets. I had been outside for twenty minutes and my eyes were fully adjusted, which matters.

The shape was long, with a narrower section at what I would call the front, and it occulted a great many stars over the two or three minutes I watched it. It made no sound whatsoever, and at that apparent size and that apparent speed something should have been audible in that silence.

I have never known what to do with this one. It is not a light in the sky, which people will listen to. It is an absence of lights in the sky, which people find much harder, and which I think is actually the stranger observation of the two.`,
  },
  {
    name: 'Marisol Vega', title: 'Warm patch on the hillside all winter', location: 'Patagonia, Chile', year: '2018', type: 'Other',
    tags: ['ground-trace', 'mountain', 'winter', 'daytime', 'solitary', 'animal-reaction'],
    text: `There was a patch on the hillside about eight metres across where snow did not lie, all winter, and the ground under it was warm to the hand.

It appeared after a night when the dogs would not settle, and I did not connect the two things for several weeks, and I am only connecting them now because I have read other accounts here that put those two facts side by side.

There is no geothermal activity in this area and I have had that confirmed by two people who would know. The patch did not correspond to any pipe, any burrow, any rock formation, or any south-facing advantage — the hill faces the wrong way for sun.

By the following spring it had gone and the grass grew over it and grew normally. I took photographs, which I still have, and they show a bare oval in snow and prove almost nothing on their own, and I know that.`,
  },
  {
    name: 'Ezra Lindholm', title: 'The night my brother would not come inside', location: 'Traverse City, MI', year: '1987', type: 'Presence',
    tags: ['presence', 'children', 'family', 'water', 'night', 'never-told', 'memory-gap'],
    text: `My brother stood at the end of the yard facing the lake for over an hour and would not come in, and would not answer, and afterwards had no memory of any of it.

He was fourteen. He was not a sleepwalker and had never done anything like it before or since. I was eleven and I went out three times and stood beside him and said his name and he did not respond at all, and the third time I took his hand and he did not react to that either.

Our mother eventually walked him inside and he came without resistance, like someone being moved rather than someone walking.

In the morning he was completely himself and remembered going to bed at nine. He is fifty-two now and has never remembered it, and he is quite uncomfortable that I have written this down, and I have his permission but not his enthusiasm. I include that because I think it is relevant to how these things sit in a family.`,
  },
  {
    name: 'Halima Saleh', title: 'It was in the dust, then it was not', location: 'Wadi Rum, Jordan', year: '2019', type: 'Humanoid',
    tags: ['humanoid', 'desert', 'daytime', 'apparition', 'pressure'],
    text: `A figure stood in the blowing dust about sixty metres from me in full daylight, and then the dust cleared and there was nothing there and nowhere it could have gone.

The ground between us was flat and open. This is not country with cover.

It was upright, and it was proportioned wrongly for a person — long through the middle rather than the limbs, which is a strange thing to be certain about and yet I am.

The pressure is what I remember in my body rather than my eyes. It was like the pressure before a storm and there was no storm, and it lifted the moment the figure was gone. I stood there for several minutes afterwards checking the ground for any depression or track, because I am a practical person and that is what a practical person does, and there was nothing.`,
  },
  {
    name: 'Tobias Frame', title: 'Ball lightning, or something wearing its coat', location: 'Norfolk, UK', year: '1975', type: 'Light',
    tags: ['orb', 'farm', 'daytime', 'electrical', 'hum'], portrait: true,
    text: `It came in through the open door of the barn at about chest height, crossed the floor, and went out the other side, and it took perhaps four seconds.

Everyone tells me it was ball lightning and I have read a fair amount about ball lightning since and I am willing to believe them. What I would say is that it was not a storm day. It was overcast and still and nothing was going on in the sky.

It was about the size of a grapefruit, and it had a hum, and it moved in a straight line at a steady speed and did not rise or fall.

Three of us were in the barn. One went to the doctor about his eyes and was fine. I put this here not because I think it was anything exotic but because I have come to think these archives should hold the ordinary-strange as well as the extraordinary, and because if it was ball lightning then it is one of the better-witnessed instances of it that I know of.`,
  },
  {
    name: 'Grete Solheim', title: 'Two suns for about a minute', location: 'Tromsø, Norway', year: '2010', type: 'Light',
    tags: ['daytime', 'winter', 'orb', 'coastal', 'silent'],
    text: `There were two sources of light in the sky and two sets of shadows on the snow for about a minute. The shadows are the part I would ask anyone to hold on to, because shadows are not subjective.

It was late morning in February, which this far north means the light is low and long and every shadow is enormous. Then there were two of everything.

The second source was smaller and higher and to the south-west of the sun, and it was bright enough that I could not look at it directly.

There were perhaps thirty people on that street and I have always assumed somebody must have photographed it, and I have never found anything. That has bothered me more over the years than the event did. Thirty people, a minute of doubled shadows on fresh snow, and no record of it anywhere except in my head and now in yours.`,
  },
  {
    name: 'Ines Carvalho', title: 'The corridor dream, shared', location: 'Porto, Portugal', year: '2021', type: 'Dream',
    tags: ['dreams-after', 'telepathy', 'family', 'memory-gap', 'presence'],
    text: `My sister and I described the same corridor to each other on the same morning, having not spoken during the night and living in different cities.

I want to set out clearly what is and is not remarkable here. Sisters share a childhood home, share references, and can dream similar architecture. I have thought about that a great deal.

What does not resolve that way is the floor. We both described a floor that gave slightly underfoot, like walking on something breathing, and we both used the word breathing, independently, in the first sixty seconds of the phone call, and neither of us had ever described a dream that way before.

Neither of us has had it again. We are not people who look for this sort of thing — I am a pharmacist and she audits accounts. I am recording it because I have now read three other accounts in archives like this one that mention a soft corridor, and after the third I stopped being able to leave it alone.`,
  },
  {
    name: 'Duane Petit', title: 'Lights over the levee, four nights running', location: 'Vicksburg, MS', year: '1998', type: 'Light',
    tags: ['orb', 'water', 'formation', 'multiple-witness', 'never-told'],
    text: `Four nights in a row, same hour, same stretch of levee, and by the third night there were forty people out there waiting for it, and it came anyway.

That is the part that has always struck me as the strangest thing about it — that it did not seem to mind an audience. Everything I had ever heard about these lights said they went away when people came looking.

Two lights, sometimes three, moving along the river at a height I would guess at a few hundred feet, keeping a spacing between them. They would run downriver for perhaps two miles, stop, and go back.

On the fifth night nobody came and I do not know whether it did. I have often wished I had gone out on that fifth night. Forty people saw this over four evenings in a small place and to my knowledge not one of us ever reported it anywhere, and I have never entirely understood why not, including in my own case.`,
  },
  {
    name: 'Oona Brannigan', title: 'The static came back on the anniversary', location: 'Sligo, Ireland', year: '2022', type: 'Other',
    tags: ['static', 'radio-failure', 'coastal', 'night', 'generational', 'never-told', 'presence'],
    text: `My father wrote down what happened to him on this coast in 1981 and I found the page after he died, and a year later to the day the same thing happened in my kitchen.

His account describes the radio going to noise with a shape in it and a feeling of company in the room. He used the word company, which is not a word he used about anything else in his life, and which is why I could not put the page down.

Mine was the same, and I want to be careful, because I had read his account by then and I know exactly what that does to a person. I am not offering this as evidence. I am offering it as a coincidence I have not been able to make small.

What I keep returning to is that he never told me. He wrote it down and put it in a box and let me find it after he was gone, and I have decided to do the opposite, which is why this is here with my name on it.`,
  },
];

// Pending submissions, so the review queue and the privacy controls have
// something to exercise. These stay out of the public field until approved.
export const PENDING = [
  {
    name: 'Test Submitter', title: 'Something over the ridge line', location: 'Ogden, UT', year: '2024', type: 'Light',
    tags: ['orb', 'mountain', 'night'], privacy: 'public',
    text: `This is a pending test submission. It should appear in the review queue and nowhere on the public site until somebody approves it.

The second paragraph exists so that the queue can be checked against a record with more than one block of text in it.`,
  },
  {
    name: 'Anonymous', title: 'Lights while driving north', location: 'Bangor, ME', year: '2022', type: 'Craft',
    tags: ['highway', 'night', 'orb'], privacy: 'community',
    text: `A second pending test submission, marked community-only, to check that the privacy setting survives the approve step and that the record is then visible to members and not to visitors.

It should carry the community marking everywhere it appears.`,
  },
  {
    name: 'Quiet Voice', title: 'A record I do not want shown', location: 'Withheld', year: '1991', type: 'Presence',
    tags: ['presence', 'night', 'never-told'], privacy: 'archive',
    text: `A pending test submission marked strictly archived. After approval it should be preserved in the archive and must never appear as a cell in the honeycomb, and its transcript must never be sent to a browser.

If this text is ever visible on the public site, something is wrong.`,
  },
];

