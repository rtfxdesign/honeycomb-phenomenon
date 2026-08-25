import { S3Client } from "@aws-sdk/client-s3";

/**
 * Shared R2 access.
 *
 * The preview deploy shares production's bucket (the API token is scoped to
 * that one bucket) but sets R2_PREFIX="preview/" so its objects never mix with
 * the live archive. The app and the API speak *logical* keys
 * ("submissions/sub_1.json"); phys() maps a logical key to the physical object
 * key and toLogical() maps it back, so the prefix stays invisible above this
 * module.
 */

export const BUCKET = process.env.R2_BUCKET_NAME;
export const PREFIX = process.env.R2_PREFIX || "";

export const phys = (logicalKey: string) => `${PREFIX}${logicalKey}`;

export const toLogical = (physicalKey: string) =>
  PREFIX && physicalKey.startsWith(PREFIX) ? physicalKey.slice(PREFIX.length) : physicalKey;

export const r2Configured = () =>
  Boolean(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID);

export function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}
