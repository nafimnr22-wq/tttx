import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const usersFile = join(__dirname, 'users.json');

async function clearUsers() {
    try {
        await fs.writeFile(usersFile, JSON.stringify([], null, 2));
        console.log('✅ Users cleared successfully');
    } catch (error) {
        console.error('❌ Error clearing users:', error);
    }
}

clearUsers();