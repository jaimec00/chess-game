#!/usr/bin/env node

import puppeteer from 'puppeteer-core';
import { execSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const BRAVE_PATH = '/usr/bin/brave-browser';
const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

const outPath = resolve(process.argv[2] || '/tmp/chess-screenshot.png');

if (!existsSync(BRAVE_PATH)) {
  console.error(`Brave not found at ${BRAVE_PATH}`);
  process.exit(1);
}

let server;
let browser;

try {
  // Build the app
  console.log('Building app...');
  execSync('node_modules/.bin/vite build', { stdio: 'inherit' });

  // Start preview server in background
  console.log('Starting preview server...');
  server = spawn('node_modules/.bin/vite', ['preview', '--port', String(PREVIEW_PORT)], {
    stdio: 'pipe',
  });

  // Wait for server to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview server timed out')), 15000);
    server.stdout.on('data', (data) => {
      if (data.toString().includes(String(PREVIEW_PORT))) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes(String(PREVIEW_PORT))) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('Launching browser...');
  browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-extensions',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });

  console.log(`Navigating to ${PREVIEW_URL}...`);
  await page.goto(PREVIEW_URL, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for the board to render
  await page.waitForSelector('.board', { timeout: 10000 });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Extra settle time for CSS transitions / 3D rendering
  await new Promise((r) => setTimeout(r, 500));

  console.log(`Saving screenshot to ${outPath}...`);
  await page.screenshot({ path: outPath, type: 'png' });

  console.log('Done.');
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) {
    server.kill('SIGTERM');
    // Give it a moment then force kill
    setTimeout(() => server.kill('SIGKILL'), 2000);
  }
}
