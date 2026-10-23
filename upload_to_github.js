/**
 * Script to automatically push files to GitHub repo HikaruIR/HikaruIR.github.io
 * Usage: node upload_to_github.js <GITHUB_TOKEN>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_OWNER = 'HikaruIR';
const REPO_NAME = 'HikaruIR.github.io';
const BRANCH = 'main';

const token = process.argv[2] || process.env.GITHUB_TOKEN;

if (!token) {
  console.log('\n======================================================');
  console.log('GitHub Personal Access Token is required to push!');
  console.log('Usage: node upload_to_github.js <YOUR_GITHUB_TOKEN>');
  console.log('Or set GITHUB_TOKEN environment variable.');
  console.log('======================================================\n');
  process.exit(1);
}

const filesToUpload = [
  'index.html',
  'style.css',
  'main.js',
  'avatar.jpg',
  'background.jpg',
  'music.mp3',
  'music2.mp3'
];

function request(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method: method,
      headers: {
        'User-Agent': 'NodeJS-Uploader',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...(dataString ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString)
        } : {})
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          const json = resData ? JSON.parse(resData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ status: res.statusCode, data: json });
          }
        } catch (e) {
          reject({ status: res.statusCode, error: e, raw: resData });
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function getFileSha(filePath) {
  try {
    const res = await request('GET', `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(filePath)}?ref=${BRANCH}`);
    return res.sha;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function uploadFile(fileName) {
  const fullPath = path.join(__dirname, fileName);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping missing file: ${fileName}`);
    return;
  }

  const content = fs.readFileSync(fullPath);
  const base64Content = content.toString('base64');
  const sha = await getFileSha(fileName);

  const payload = {
    message: `Update ${fileName} with modern minimalist profile design`,
    content: base64Content,
    branch: BRANCH
  };

  if (sha) payload.sha = sha;

  console.log(`Uploading ${fileName} (${(content.length / 1024).toFixed(1)} KB)...`);
  await request('PUT', `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(fileName)}`, payload);
  console.log(`✓ ${fileName} successfully committed!`);
}

async function main() {
  console.log(`Starting upload to https://github.com/${REPO_OWNER}/${REPO_NAME} (branch: ${BRANCH})...\n`);
  for (const f of filesToUpload) {
    try {
      await uploadFile(f);
    } catch (err) {
      console.error(`✗ Error uploading ${f}:`, err.data || err);
    }
  }
  console.log('\nAll done! GitHub Pages will update your live site in ~30 seconds.');
}

main().catch(err => console.error('Fatal error:', err));
