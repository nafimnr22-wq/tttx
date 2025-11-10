import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { readFileSync } from 'fs';
import cors from 'cors';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

const uploadsDir = join(__dirname, 'uploads');
const sharedFilesDir = join(__dirname, 'shared_files');
const chatDir = join(__dirname, 'chat');
const notificationsDir = join(__dirname, 'notifications');
const usersFile = join(__dirname, 'users.json');
const accountsFile = join(__dirname, 'accounts.json');
const callsFile = join(__dirname, 'calls.json');
const filesMetaFile = join(__dirname, 'files_meta.json');
const signalingMessages = [];
let messageIdCounter = 0;
let callIdCounter = 0;

const USER_TIMEOUT = 5 * 60 * 1000;

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const isShared = req.query.shared === 'true';
            const isMeeting = req.query.meeting === 'true';
            const roomId = req.body.roomId;

            let dir;
            if (isMeeting && roomId) {
                dir = join(uploadsDir, roomId);
            } else if (isShared) {
                dir = sharedFilesDir;
            } else {
                dir = uploadsDir;
            }

            await fs.mkdir(dir, { recursive: true });
            cb(null, dir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `${timestamp}-${file.originalname}`);
    }
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use('/shared_files', express.static(sharedFilesDir));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

async function initializeFiles() {
    const files = [
        { path: usersFile, content: [] },
        { path: accountsFile, content: [] },
        { path: callsFile, content: [] },
        { path: filesMetaFile, content: [] }
    ];

    for (const file of files) {
        try {
            await fs.access(file.path);
        } catch {
            await fs.writeFile(file.path, JSON.stringify(file.content, null, 2));
        }
    }

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(sharedFilesDir, { recursive: true });
    await fs.mkdir(chatDir, { recursive: true });
    await fs.mkdir(notificationsDir, { recursive: true });
}

setInterval(async () => {
    try {
        const data = await fs.readFile(usersFile, 'utf-8');
        let users = JSON.parse(data);
        const now = Date.now();
        const activeBefore = users.length;

        users = users.filter(user => {
            const inactive = now - user.timestamp > USER_TIMEOUT;
            if (inactive) console.log('🗑️ Removing inactive user:', user.name);
            return !inactive;
        });

        if (users.length !== activeBefore) {
            await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
        }
    } catch (error) {
        console.error('Error cleaning up users:', error);
    }
}, 60000);

// ==================== AUTHENTICATION ====================
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, password, fullName } = req.body;
        if (!username || !password || !fullName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let accounts = [];
        try {
            const data = await fs.readFile(accountsFile, 'utf-8');
            accounts = JSON.parse(data);
        } catch {}

        if (accounts.find(acc => acc.username === username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const newAccount = {
            id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            username,
            password,
            fullName,
            createdAt: Date.now(),
        };

        accounts.push(newAccount);
        await fs.writeFile(accountsFile, JSON.stringify(accounts, null, 2));

        res.json({
            success: true,
            account: { id: newAccount.id, username: newAccount.username, fullName: newAccount.fullName }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing credentials' });
        }

        let accounts = [];
        try {
            const data = await fs.readFile(accountsFile, 'utf-8');
            accounts = JSON.parse(data);
        } catch {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const account = accounts.find(acc => acc.username === username && acc.password === password);
        if (!account) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            account: { id: account.id, username: account.username, fullName: account.fullName }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/accounts', async (req, res) => {
    try {
        let accounts = [];
        try {
            const data = await fs.readFile(accountsFile, 'utf-8');
            accounts = JSON.parse(data);
        } catch {}

        const safeAccounts = accounts.map(acc => ({
            id: acc.id,
            username: acc.username,
            fullName: acc.fullName,
        }));

        res.json(safeAccounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== FILES ====================
app.post('/api/files/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const { uploaderId, uploaderName, sharedWith, isPublic, roomId } = req.body;
        const isMeeting = req.query.meeting === 'true';

        let filesMeta = [];
        try {
            const data = await fs.readFile(filesMetaFile, 'utf-8');
            filesMeta = JSON.parse(data);
        } catch {}

        let filePath;
        if (isMeeting && roomId) {
            filePath = `/uploads/${roomId}/${req.file.filename}`;
        } else if (req.query.shared === 'true') {
            filePath = `/shared_files/${req.file.filename}`;
        } else {
            filePath = `/uploads/${req.file.filename}`;
        }

        const fileMeta = {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            uploaderId: uploaderId || 'unknown',
            uploaderName: uploaderName || 'Unknown',
            sharedWith: sharedWith ? JSON.parse(sharedWith) : [],
            isPublic: isPublic === 'true',
            uploadedAt: Date.now(),
            path: filePath,
            roomId: isMeeting ? roomId : undefined
        };

        filesMeta.push(fileMeta);
        await fs.writeFile(filesMetaFile, JSON.stringify(filesMeta, null, 2));

        res.json({
            success: true,
            file: fileMeta
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/files', async (req, res) => {
    try {
        const { userId, type } = req.query;

        let filesMeta = [];
        try {
            const data = await fs.readFile(filesMetaFile, 'utf-8');
            filesMeta = JSON.parse(data);
        } catch {}

        let filteredFiles = filesMeta;

        if (type === 'shared-with-me' && userId) {
            filteredFiles = filesMeta.filter(file =>
                file.sharedWith.includes(userId) ||
                (file.isPublic && file.uploaderId !== userId)
            );
        } else if (type === 'public') {
            filteredFiles = filesMeta.filter(file => file.isPublic);
        } else if (type === 'my-uploads' && userId) {
            filteredFiles = filesMeta.filter(file => file.uploaderId === userId);
        }

        res.json(filteredFiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const { userId } = req.query;

        let filesMeta = [];
        try {
            const data = await fs.readFile(filesMetaFile, 'utf-8');
            filesMeta = JSON.parse(data);
        } catch {}

        const fileIndex = filesMeta.findIndex(f => f.id === fileId);
        if (fileIndex === -1) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = filesMeta[fileIndex];
        if (file.uploaderId !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Delete physical file
        const filePath = join(__dirname, file.path);
        try {
            await fs.unlink(filePath);
        } catch {}

        filesMeta.splice(fileIndex, 1);
        await fs.writeFile(filesMetaFile, JSON.stringify(filesMeta, null, 2));

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== MESSAGES ====================
function getChatFileName(userId1, userId2) {
    const sorted = [userId1, userId2].sort();
    return join(chatDir, `${sorted[0]}-${sorted[1]}.json`);
}

app.post('/api/messages', async (req, res) => {
    try {
        const { fromId, toId, fromName, toName, content } = req.body;

        const chatFile = getChatFileName(fromId, toId);
        let messages = [];
        try {
            const data = await fs.readFile(chatFile, 'utf-8');
            messages = JSON.parse(data);
        } catch {}

        const message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromId,
            toId,
            fromName,
            toName,
            content,
            timestamp: Date.now(),
            read: false
        };

        messages.push(message);
        await fs.writeFile(chatFile, JSON.stringify(messages, null, 2));

        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const { userId, otherUserId } = req.query;

        const chatFile = getChatFileName(userId, otherUserId);
        let messages = [];
        try {
            const data = await fs.readFile(chatFile, 'utf-8');
            messages = JSON.parse(data);
        } catch {}

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== NOTIFICATIONS ====================
function getNotificationFile(accountId) {
    return join(notificationsDir, `${accountId}.json`);
}

app.post('/api/notifications', async (req, res) => {
    try {
        const { toAccountId, type, from, message } = req.body;

        const notifFile = getNotificationFile(toAccountId);
        let notifications = [];
        try {
            const data = await fs.readFile(notifFile, 'utf-8');
            notifications = JSON.parse(data);
        } catch {}

        const notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            from,
            message,
            timestamp: Date.now(),
            read: false,
        };

        notifications.push(notification);
        await fs.writeFile(notifFile, JSON.stringify(notifications, null, 2));

        res.json({ success: true, notification });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/notifications', async (req, res) => {
    try {
        const { accountId, unreadOnly } = req.query;

        const notifFile = getNotificationFile(accountId);
        let notifications = [];
        try {
            const data = await fs.readFile(notifFile, 'utf-8');
            notifications = JSON.parse(data);
        } catch {}

        if (unreadOnly === 'true') {
            notifications = notifications.filter(n => !n.read);
        }

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/notifications/:notificationId', async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { accountId, read } = req.body;

        const notifFile = getNotificationFile(accountId);
        let notifications = [];
        try {
            const data = await fs.readFile(notifFile, 'utf-8');
            notifications = JSON.parse(data);
        } catch {
            return res.status(404).json({ error: 'Notifications not found' });
        }

        const notifIndex = notifications.findIndex(n => n.id === notificationId);
        if (notifIndex === -1) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        notifications[notifIndex].read = read;
        await fs.writeFile(notifFile, JSON.stringify(notifications, null, 2));

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/notifications/:notificationId', async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { accountId } = req.query;

        const notifFile = getNotificationFile(accountId);
        let notifications = [];
        try {
            const data = await fs.readFile(notifFile, 'utf-8');
            notifications = JSON.parse(data);
        } catch {
            return res.status(404).json({ error: 'Notifications not found' });
        }

        notifications = notifications.filter(n => n.id !== notificationId);
        await fs.writeFile(notifFile, JSON.stringify(notifications, null, 2));

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== GLOBAL CHAT ====================
const globalChatFile = join(chatDir, 'global.json');

app.post('/api/global-chat', async (req, res) => {
    try {
        const { fromId, fromName, content } = req.body;

        let messages = [];
        try {
            const data = await fs.readFile(globalChatFile, 'utf-8');
            messages = JSON.parse(data);
        } catch {}

        const message = {
            id: `global-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromId,
            fromName,
            content,
            timestamp: Date.now()
        };

        messages.push(message);
        await fs.writeFile(globalChatFile, JSON.stringify(messages, null, 2));

        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/global-chat', async (req, res) => {
    try {
        let messages = [];
        try {
            const data = await fs.readFile(globalChatFile, 'utf-8');
            messages = JSON.parse(data);
        } catch {}

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CALLS ====================
app.post('/api/calls', async (req, res) => {
    try {
        const { fromAccountId, toAccountId, fromName, toName, roomId } = req.body;

        let calls = [];
        try {
            const data = await fs.readFile(callsFile, 'utf-8');
            calls = JSON.parse(data);
        } catch {}

        const newCall = {
            id: `call-${callIdCounter++}`,
            fromAccountId,
            toAccountId,
            fromName,
            toName,
            roomId,
            status: 'ringing',
            createdAt: Date.now(),
        };

        calls.push(newCall);
        await fs.writeFile(callsFile, JSON.stringify(calls, null, 2));

        res.json({ success: true, call: newCall });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ... (keep all other existing endpoints: users, signaling, etc.)

app.post('/api/files/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('✅ File uploaded:', req.file.filename);
    res.json({
        message: 'File uploaded successfully',
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`
    });
});

app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = join(uploadsDir, filename);
    res.download(filepath);
});

// Create or update user
app.post('/api/users', async (req, res) => {
    try {
        const { id, name, peerId, accountId } = req.body;

        if (!id || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let users = [];
        try {
            const data = await fs.readFile(usersFile, 'utf-8');
            users = JSON.parse(data);
        } catch {
            users = [];
        }

        // Remove old entry with same ID
        users = users.filter(u => u.id !== id);

        // Add new/updated user
        const userData = { id, name, peerId, accountId, timestamp: Date.now() };
        users.push(userData);

        await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
        console.log('✅ User saved:', userData.name);
        res.json({ success: true, user: userData });
    } catch (error) {
        console.error('❌ Error saving user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const data = await fs.readFile(usersFile, 'utf-8');
        const users = JSON.parse(data);

        // Filter out old users
        const now = Date.now();
        const activeUsers = users.filter(u => now - u.timestamp < USER_TIMEOUT);

        console.log('📋 Users list requested:', activeUsers.length, 'active users');
        res.json(activeUsers);
    } catch {
        res.json([]);
    }
});

// Get specific user
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await fs.readFile(usersFile, 'utf-8');
        const users = JSON.parse(data);

        const user = users.find(u => u.id === id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user is still active
        const now = Date.now();
        if (now - user.timestamp > USER_TIMEOUT) {
            return res.status(404).json({ error: 'User expired' });
        }

        res.json(user);
    } catch {
        res.status(404).json({ error: 'User not found' });
    }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        let users = [];
        try {
            const data = await fs.readFile(usersFile, 'utf-8');
            users = JSON.parse(data);
        } catch {
            users = [];
        }

        const before = users.length;
        users = users.filter(u => u.id !== id);

        await fs.writeFile(usersFile, JSON.stringify(users, null, 2));

        if (users.length < before) {
            console.log('✅ User deleted:', id);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user heartbeat
app.put('/api/users/:id/heartbeat', async (req, res) => {
    try {
        const { id } = req.params;

        let users = [];
        try {
            const data = await fs.readFile(usersFile, 'utf-8');
            users = JSON.parse(data);
        } catch {
            return res.status(404).json({ error: 'User not found' });
        }

        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        users[userIndex].timestamp = Date.now();
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error updating heartbeat:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Add this to your server.js to replace the existing signaling endpoints

// ✅ Add this to your server.js to replace the existing signaling endpoints

// Signaling endpoints - UPDATED
app.post('/api/signaling', (req, res) => {
    try {
        const message = req.body;
        message.id = messageIdCounter++;
        message.timestamp = Date.now();
        signalingMessages.push(message);

        console.log(`📨 Signaling message #${message.id}:`, {
            type: message.type,
            from: message.fromName,
            to: message.to || 'broadcast',
            roomId: message.roomId || 'global'
        });

        // Keep only last 1000 messages
        if (signalingMessages.length > 1000) {
            signalingMessages.splice(0, signalingMessages.length - 500);
        }

        res.json({ success: true, id: message.id });
    } catch (error) {
        console.error('❌ Error saving signaling message:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/signaling', (req, res) => {
    try {
        const lastId = parseInt(req.query.lastId || '-1');
        const peerId = req.query.peerId;
        const roomId = req.query.roomId;

        // ✅ FIXED: Filter messages by room
        let messages = signalingMessages.filter(msg => {
            // Message must be newer than lastId
            if (msg.id <= lastId) return false;

            // If in a room, only get messages from that room
            if (roomId) {
                if (msg.roomId !== roomId) return false;
            }

            // Message must be broadcast OR directed to this peer
            if (msg.to && msg.to !== peerId) return false;

            return true;
        });

        if (messages.length > 0) {
            console.log(`📤 Sending ${messages.length} messages to peer ${peerId} in room ${roomId || 'global'}`);
        }

        res.json(messages);
    } catch (error) {
        console.error('❌ Error fetching signaling messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint
app.get('/api/signaling/debug', (req, res) => {
    res.json({
        total: signalingMessages.length,
        messages: signalingMessages.slice(-20),
        messageIdCounter
    });
});
// Copy all the remaining endpoints from your original server.js here
// (users, signaling, heartbeat, etc.)

// Add this to your server.js after the existing calls endpoint

// ✅ GET calls for a specific user
app.get('/api/calls', async (req, res) => {
    try {
        const { toAccountId } = req.query;

        let calls = [];
        try {
            const data = await fs.readFile(callsFile, 'utf-8');
            calls = JSON.parse(data);
        } catch {}

        if (toAccountId) {
            // Filter calls for this user
            calls = calls.filter(call => call.toAccountId === toAccountId);
        }

        res.json(calls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Update call status (accept/reject/ended)
app.patch('/api/calls/:callId', async (req, res) => {
    try {
        const { callId } = req.params;
        const { status } = req.body;

        let calls = [];
        try {
            const data = await fs.readFile(callsFile, 'utf-8');
            calls = JSON.parse(data);
        } catch {}

        const callIndex = calls.findIndex(c => c.id === callId);
        if (callIndex === -1) {
            return res.status(404).json({ error: 'Call not found' });
        }

        if (status === 'rejected' || status === 'ended') {
            calls.splice(callIndex, 1);
        } else {
            calls[callIndex].status = status;
        }

        await fs.writeFile(callsFile, JSON.stringify(calls, null, 2));

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Delete old calls (cleanup)
app.delete('/api/calls/:callId', async (req, res) => {
    try {
        const { callId } = req.params;

        let calls = [];
        try {
            const data = await fs.readFile(callsFile, 'utf-8');
            calls = JSON.parse(data);
        } catch {}

        calls = calls.filter(c => c.id !== callId);
        await fs.writeFile(callsFile, JSON.stringify(calls, null, 2));

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Cleanup old calls automatically (run every minute)
setInterval(async () => {
    try {
        const data = await fs.readFile(callsFile, 'utf-8');
        let calls = JSON.parse(data);
        const now = Date.now();

        // Remove calls older than 5 minutes
        const before = calls.length;
        calls = calls.filter(call => now - call.createdAt < 5 * 60 * 1000);

        if (calls.length !== before) {
            await fs.writeFile(callsFile, JSON.stringify(calls, null, 2));
            console.log(`🧹 Cleaned up ${before - calls.length} old calls`);
        }
    } catch (error) {
        console.error('Error cleaning up calls:', error);
    }
}, 60000); // Every minute

async function startServer() {
    await initializeFiles();

    let useHttps = false;
    let httpsOptions = null;

    try {
        const keyPath = join(__dirname, 'key.pem');
        const certPath = join(__dirname, 'cert.pem');

        httpsOptions = {
            key: readFileSync(keyPath),
            cert: readFileSync(certPath)
        };
        useHttps = true;
        console.log('🔒 SSL certificates found - using HTTPS');
    } catch (error) {
        console.log('⚠️  SSL certificates not found - using HTTP');
    }

    if (useHttps && httpsOptions) {
        https.createServer(httpsOptions, app).listen(PORT, () => {
            console.log('🚀 HTTPS Server running on https://localhost:' + PORT);
            console.log('📁 File tracking enabled');
            console.log('💬 Messaging system ready');
        });
    } else {
        http.createServer(app).listen(PORT, () => {
            console.log('🚀 HTTP Server running on http://localhost:' + PORT);
            console.log('📁 File tracking enabled');
            console.log('💬 Messaging system ready');
        });
    }
}

startServer();