import { createFolderName } from './createFolderName';
import puppeteer from 'puppeteer-extra';
import { downloadChapter } from './downloadChapter';
import { collectChapters } from './getChapters';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { collectMetadata } from './collectMetadata';
import { makeEpub } from './makeEpub';
// @ts-ignore
import * as chromium from 'chromium';

puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
puppeteer.use(StealthPlugin());

interface MainProps {
  ranobeUrl: string;
}

const main = async ({ ranobeUrl }: MainProps) => {
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS?.toLowerCase() !== 'false',
    executablePath: chromium.path
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1200,
    height: 800
  });
  await page.setJavaScriptEnabled(true);
  await page.setDefaultNavigationTimeout(0);
  await page.setCacheEnabled(true);
  await page.goto(ranobeUrl);

  const metadata = await collectMetadata(page);
  const chapters = await collectChapters(page, ranobeUrl, metadata.chapters);
  const folderName = createFolderName(metadata.title);

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    console.log(`${i + 1}. Downloading chapter: ${chapter.title}`);
    await downloadChapter(page, ranobeUrl, chapter, folderName);
  }

  await browser.close();
  console.log('All chapters downloaded!');
  console.log('Generating a .epub file...');
  await makeEpub(metadata);
};

const parseArgsAndStart = async () => {
  let ranobeUrl = process.argv[2];

  if (!ranobeUrl.startsWith('https://ranobelib.me')) {
    throw new Error('This program supports only ranobelib.me');
  }

  if (ranobeUrl.indexOf('?') !== -1) {
    ranobeUrl = ranobeUrl.slice(0, ranobeUrl.indexOf('?'));
  }

  return await main({
    ranobeUrl
  });
};

parseArgsAndStart().catch(console.error);
