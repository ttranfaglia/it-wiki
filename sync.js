const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { marked } = require('marked');

// --- BULLETPROOF CONFIGURATION WITH AUTOMATIC CLEANUP ---
let rawSubdomain = process.env.ZENDESK_SUBDOMAIN || process.env.ZD_SUBDOMAIN || 'napacoe1677781178';

// Clean the string: remove spaces, force lowercase, and strip accidental domain inclusions
let cleanSubdomain = rawSubdomain.trim().toLowerCase();
cleanSubdomain = cleanSubdomain.replace('https://', '').replace('http://', '');
cleanSubdomain = cleanSubdomain.split('.')[0]; // Keeps ONLY the raw prefix (e.g. "mycompany-sandbox")

const ZENDESK_SUBDOMAIN = cleanSubdomain;
const ZENDESK_EMAIL = (process.env.ZENDESK_EMAIL || process.env.ZD_EMAIL || '').trim();
const ZENDESK_API_TOKEN = (process.env.ZENDESK_API_TOKEN || process.env.ZD_TOKEN || '').trim();
const TARGET_SECTION_ID = '49419231917325'; 
const DOCS_DIR = './docs'; 

// Format the final URL and credentials safely
const authBuffer = Buffer.from(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`);
const authHeader = `Basic ${authBuffer.toString('base64')}`;
const baseUrl = `https://${ZENDESK_SUBDOMAIN}://`;

// 🔍 Print the clean domain directly to your logs
console.log(`🌐 Target Endpoint verified: ${baseUrl}`);


async function getExistingArticles() {
  try {
    const url = `${baseUrl}/sections/${TARGET_SECTION_ID}/articles.json`;
    const response = await axios.get(url, { headers: { 'Authorization': authHeader } });
    return response.data.articles || [];
  } catch (error) {
    console.error('❌ Error fetching existing articles:', error.message);
    return [];
  }
}

async function syncArticle(filePath, existingArticles) {
  try {
    const rawMarkdown = fs.readFileSync(filePath, 'utf8');
    const htmlBody = marked.parse(rawMarkdown);
    
    const fileName = path.basename(filePath, '.md');
    const title = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const payload = {
      article: {
        title: title,
        body: htmlBody,
        locale: 'en-us',
        user_segment_id: null, 
        draft: false 
      }
    };

    const match = existingArticles.find(a => a.title.toLowerCase() === title.toLowerCase());

    if (match) {
      const updateUrl = `${baseUrl}/articles/${match.id}.json`;
      await axios.put(updateUrl, payload, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
      });
      console.log(`🔄 Updated existing article: "${title}" (ID: ${match.id})`);
    } else {
      const createUrl = `${baseUrl}/sections/${TARGET_SECTION_ID}/articles.json`;
      const response = await axios.post(createUrl, payload, {
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
      });
      console.log(`✅ Created brand new article: "${title}" (ID: ${response.data.article.id})`);
    }
  } catch (error) {
    console.error(`❌ Error syncing ${filePath}:`, error.response ? error.response.data : error.message);
  }
}

async function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.log(`Folder ${DOCS_DIR} not found.`);
    return;
  }

  console.log('🔍 Scanning Zendesk for existing articles...');
  const existingArticles = await getExistingArticles();

  const files = fs.readdirSync(DOCS_DIR).filter(file => file.endsWith('.md'));
  console.log(`📂 Found ${files.length} Markdown file(s) to sync.`);

  for (const file of files) {
    await syncArticle(path.join(DOCS_DIR, file), existingArticles);
  }
}

// 📦 This clean function call runs everything safely
main(); 
