const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { marked } = require('marked');

// --- CONFIGURATION ---
const ZENDESK_SUBDOMAIN = 'napacoe1677781178'; // e.g., 'mycompany'
const ZENDESK_EMAIL = 'ttranfaglia@napacoe.org';
const ZENDESK_API_TOKEN = 'YyhXkGR3H5sSE2Is9SMfwqggpoFIKPWP1urYha3i5';
const TARGET_SECTION_ID = '39034934881037'; // The numeric section ID

// Auth string formatting for Zendesk API token access
const authBuffer = Buffer.from(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`);
const authHeader = `Basic ${authBuffer.toString('base64')}`;

/**
 * Converts MD to HTML and sends it to Zendesk
 */
async function uploadArticle(filePath) {
  try {
    const rawMarkdown = fs.readFileSync(filePath, 'utf8');
    
    // 1. Convert Markdown syntax to clean HTML for Zendesk Guide
    const htmlBody = marked.parse(rawMarkdown);
    
    // 2. Determine article title from the filename (e.g., "user-guide.md" becomes "User Guide")
    const fileName = path.basename(filePath, '.md');
    const title = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // 3. Build the payload required by Zendesk
    const payload = {
      article: {
        title: title,
        body: htmlBody,
        locale: 'en-us', // Change to your default Help Center language
        user_segment_id: null, // Null means visible to everyone
        permission_group_id: null // Will default to Guide Admins
      }
    };

    // 4. Send POST request to Zendesk
    const url = `https://${ZENDESK_SUBDOMAIN}://{TARGET_SECTION_ID}/articles.json`;
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Successfully created article: "${title}" (ID: ${response.data.article.id})`);
  } catch (error) {
    console.error(`❌ Error uploading ${filePath}:`, error.response ? error.response.data : error.message);
  }
}

// Example: Run the function against a specific file
uploadArticle('./docs/getting-started.md');
