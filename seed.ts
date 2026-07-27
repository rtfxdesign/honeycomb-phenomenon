import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.R2_BUCKET_NAME;

const stories = [
  {
    title: "A cold blue light in the pasture",
    location: "Rural farmland outside Roswell, New Mexico",
    experienceYear: "1987",
    transcript: "I was out checking the north fence line just after midnight when the whole pasture lit up with a cold blue light. A silent disc about the size of a small barn hung there, no more than forty feet above the ground. My cattle froze solid underneath it. For almost two minutes nothing moved except that pale glow. Then the thing shot straight up and was gone. My ears popped and I had a metallic taste in my mouth the rest of the night.",
    hashtags: ["UFOSighting", "Roswell1987", "CattleFreeze", "SilentDisc", "NewMexicoEncounter"],
    photoPath: null
  },
  {
    title: "Three bright lights pacing me",
    location: "Highway rest stop near Area 51, Nevada",
    experienceYear: "1996",
    transcript: "I pulled my rig into the rest stop at 2:17 a.m. because three bright lights were pacing me in perfect formation. They stopped dead in the desert sky, formed a triangle, and started humming so low I felt it in the steering wheel. Thirty seconds later they just... left. Faster than anything I've ever seen. I sat there with the engine off for ten minutes before I could start the truck again.",
    hashtags: ["Area51", "TriangleLights", "NightHighway", "NevadaUFO", "TruckDriverEncounter"],
    photoPath: "C:\\Users\\allen\\.gemini\\antigravity\\brain\\da801980-2f62-4481-bb68-9d6dc6ca5092\\trucker_portrait_1785119564969.jpg"
  },
  {
    title: "Hovering over the canopy",
    location: "Dense woods near Pine Barrens, New Jersey",
    experienceYear: "2004",
    transcript: "I was deer hunting alone just before dawn when the trees around me started to glow from above. A silent black triangle the size of a football field drifted over the canopy. No sound, no wind, just that soft light filtering down. It hovered for maybe ninety seconds, then slid sideways and disappeared between the trees like it was never there. My compass spun the whole time.",
    hashtags: ["BlackTriangle", "PineBarrens", "SilentCraft", "NewJerseyWoods", "HunterSighting"],
    photoPath: "C:\\Users\\allen\\.gemini\\antigravity\\brain\\da801980-2f62-4481-bb68-9d6dc6ca5092\\woman_denim_portrait_1785119578470.jpg"
  },
  {
    title: "Five orange orbs in V-formation",
    location: "Open fields outside Phoenix, Arizona",
    experienceYear: "2011",
    transcript: "I was walking my dogs at dusk when the sky above the mesas filled with five orange orbs moving in a slow, deliberate V-formation. They weren't airplanes. They stopped, pulsed brighter, then one by one winked out as if someone flipped a switch. The dogs refused to bark the entire time. I still get chills thinking about how quiet everything became.",
    hashtags: ["PhoenixLights", "OrangeOrbs", "ArizonaDesert", "VFormation", "EveningSighting"],
    photoPath: "C:\\Users\\allen\\.gemini\\antigravity\\brain\\da801980-2f62-4481-bb68-9d6dc6ca5092\\hunter_camo_portrait_1785119587280.jpg"
  },
  {
    title: "Sphere dropped out of the aurora",
    location: "Frozen lake near Fairbanks, Alaska",
    experienceYear: "2018",
    transcript: "I was ice-fishing alone under a clear night sky when a metallic sphere the size of a house dropped out of the aurora and hovered twenty feet above the ice. It made no sound. A thin beam of white light swept once across the ice near my hole, then the sphere rose straight up and vanished into the northern lights. My fish finder went completely dead for the next hour.",
    hashtags: ["AlaskaUFO", "MetallicSphere", "AuroraEncounter", "IceFishing", "SilentBeam"],
    photoPath: "C:\\Users\\allen\\.gemini\\antigravity\\brain\\da801980-2f62-4481-bb68-9d6dc6ca5092\\alaska_hood_portrait_1785119595436.jpg"
  },
  {
    title: "Translucent saucer in the fog",
    location: "Coastal cliffs near Big Sur, California",
    experienceYear: "2023",
    transcript: "I was photographing the sunset when a translucent, saucer-shaped object rose from the ocean fog and hovered level with the cliffs. It was almost see-through, like heat haze with structure. After forty seconds it tilted slightly, then accelerated horizontally and disappeared into the marine layer. My camera captured three clear frames before the autofocus failed.",
    hashtags: ["BigSurUFO", "TranslucentSaucer", "PacificCoast", "SunsetSighting", "CaliforniaEncounter"],
    photoPath: "C:\\Users\\allen\\.gemini\\antigravity\\brain\\da801980-2f62-4481-bb68-9d6dc6ca5092\\beach_sunset_portrait_1785119602971.jpg"
  }
];

async function seed() {
  console.log("Starting seed process...");
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const timestamp = Date.now() + i;
    const submissionId = `sub_${timestamp}`;
    
    let photoKey = undefined;

    // Upload photo if exists
    if (story.photoPath && fs.existsSync(story.photoPath)) {
      const ext = path.extname(story.photoPath);
      photoKey = `image/seed_${timestamp}${ext}`;
      const fileBuffer = fs.readFileSync(story.photoPath);
      
      console.log(`Uploading photo for story ${i+1}...`);
      await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: photoKey,
        Body: fileBuffer,
        ContentType: "image/jpeg"
      }));
    }

    const payload = {
      id: submissionId,
      title: story.title,
      location: story.location,
      experienceYear: story.experienceYear,
      experienceType: "Other",
      transcript: story.transcript,
      hashtags: story.hashtags,
      privacy: "public",
      photoKey: photoKey,
      submittedAt: new Date().toISOString(),
      status: "pending"
    };

    const key = `submissions/${submissionId}.json`;
    console.log(`Uploading JSON for story ${i+1}...`);
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(payload, null, 2),
      ContentType: "application/json"
    }));
  }
  console.log("Finished seeding!");
}

seed().catch(console.error);
