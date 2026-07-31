import { Prisma, PrismaClient, type Prisma as PrismaType } from '@prisma/client';
import { loadConfig } from '../config';
import { createAiClient, type AiClient } from '../books/recommendations/ai-client';
import {
  assertStoryEmbedding,
  toStoryVectorLiteral,
} from '../books/recommendations/embedding-contract';
import { chunkStoryContent } from '../books/recommendations/story-chunker';
import { createR2StoryContentReader, getR2StoryContentConfig } from '../storage/story-content-r2';
import { createStoryContentReader, type StoryContentReader } from '../storage/story-content-storage';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 500;

export type IndexStoryChunksOptions = {
  limit: number;
  after?: string;
  force: boolean;
  dryRun: boolean;
};

export type StoryIndexCandidate = {
  id: string;
  title: string;
  contentPath: string | null;
  contentUpdatedAt: Date | null;
};

export function parseIndexStoryChunksArgs(args: string[]): IndexStoryChunksOptions {
  const options: IndexStoryChunksOptions = { limit: DEFAULT_LIMIT, force: false, dryRun: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--limit') {
      options.limit = parseLimit(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--after') {
      const after = args[index + 1];
      if (!after) throw new Error('--after requires a story id');
      options.after = after;
      index += 1;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (!arg.startsWith('--') && index === 0) {
      options.limit = parseLimit(arg);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function buildStoryIndexWhere(options: IndexStoryChunksOptions): PrismaType.StoryWhereInput {
  return {
    contentPath: { not: null },
    ...(options.after ? { id: { gt: options.after } } : {}),
  };
}

async function findStoryIndexCandidates(
  prisma: PrismaClient,
  options: IndexStoryChunksOptions,
): Promise<StoryIndexCandidate[]> {
  const stalePredicate = options.force
    ? Prisma.empty
    : Prisma.sql`AND ("contentIndexedAt" IS NULL OR "contentUpdatedAt" IS NULL OR "contentUpdatedAt" > "contentIndexedAt")`;
  const afterPredicate = options.after ? Prisma.sql`AND "id" > ${options.after}` : Prisma.empty;

  return prisma.$queryRaw<StoryIndexCandidate[]>`
    SELECT "id", "title", "contentPath", "contentUpdatedAt"
    FROM "stories"
    WHERE "contentPath" IS NOT NULL
    ${stalePredicate}
    ${afterPredicate}
    ORDER BY "id" ASC
    LIMIT ${options.limit}
  `;
}

export function buildIndexMetadataUpdateData(contentUpdatedAt: Date | null, indexedAt: Date) {
  return {
    contentIndexedAt: indexedAt,
    ...(contentUpdatedAt === null ? { contentUpdatedAt: indexedAt } : {}),
  };
}

function parseLimit(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw new Error(`Limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return parsed;
}

function toVectorLiteral(values: number[]): string {
  return toStoryVectorLiteral(values);
}

async function replaceStoryChunks(
  prisma: PrismaClient,
  storyId: string,
  chunks: Array<{ chunkIndex: number; content: string; embedding: number[] }>,
) {
  await prisma.$transaction(async (tx) => {
    await tx.storyChunk.deleteMany({ where: { storyId } });

    if (chunks.length === 0) {
      return;
    }

    const values = Prisma.join(
      chunks.map((chunk) => Prisma.sql`(gen_random_uuid()::text, ${storyId}, ${chunk.chunkIndex}, ${chunk.content}, ${toVectorLiteral(chunk.embedding)}::vector)`),
    );

    await tx.$executeRaw`
      INSERT INTO "story_chunks" ("id", "storyId", "chunkIndex", "content", "embedding")
      VALUES ${values}
    `;
  });
}

export async function indexStoryCandidate(deps: {
  prisma: Pick<PrismaClient, '$transaction' | 'story'>;
  aiClient: Pick<AiClient, 'embedText'>;
  storyContentReader: StoryContentReader;
  story: StoryIndexCandidate;
}): Promise<'indexed' | 'skipped_missing_content'> {
  const { prisma, aiClient, storyContentReader, story } = deps;

  if (!story.contentPath) {
    return 'skipped_missing_content';
  }

  const content = await storyContentReader.read(story.contentPath);
  if (content === null) {
    return 'skipped_missing_content';
  }

  const chunks = chunkStoryContent(content);
  const chunksWithEmbeddings: Array<{ chunkIndex: number; content: string; embedding: number[] }> = [];

  for (const chunk of chunks) {
    const embedding = assertStoryEmbedding(await aiClient.embedText(`passage: ${chunk.content}`));
    chunksWithEmbeddings.push({ ...chunk, embedding });
  }

  await replaceStoryChunks(prisma as PrismaClient, story.id, chunksWithEmbeddings);
  const indexedAt = new Date();
  await prisma.story.update({
    where: { id: story.id },
    data: buildIndexMetadataUpdateData(story.contentUpdatedAt, indexedAt),
  });

  return 'indexed';
}

async function main() {
  const options = parseIndexStoryChunksArgs(process.argv.slice(2));
  const config = loadConfig();
  const prisma = new PrismaClient();
  const aiClient = options.dryRun ? null : createAiClient(config.aiServiceUrl);
  const r2Config = getR2StoryContentConfig(config);
  const storyContentReader = createStoryContentReader({
    r2Reader: r2Config ? createR2StoryContentReader(r2Config) : null,
    logger: console,
  });

  try {
    const stories = await findStoryIndexCandidates(prisma, options);

    if (options.dryRun) {
      console.log(`Dry run: ${stories.length} stories need indexing`);
      for (const story of stories) {
        console.log(`${story.id}\t${story.title}`);
      }

      const lastStory = stories.at(-1);
      if (lastStory) {
        console.log(`Next cursor: ${lastStory.id}`);
      }
      return;
    }

    for (const story of stories) {
      if (!aiClient) {
        throw new Error('AI client is required when not running dry-run');
      }

      const result = await indexStoryCandidate({
        prisma,
        aiClient,
        storyContentReader,
        story,
      });

      if (result === 'skipped_missing_content') {
        console.warn(`Skipped ${story.title}: story content was not found in R2 or local storage`);
        continue;
      }

      console.log(`Indexed story chunks for ${story.title}`);
    }

    console.log(`Indexed story chunks for ${stories.length} stories`);
    const lastStory = stories.at(-1);
    if (lastStory) {
      console.log(`Next cursor: ${lastStory.id}`);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Prisma error ${error.code}: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.JEST_WORKER_ID === undefined) {
  void main();
}
