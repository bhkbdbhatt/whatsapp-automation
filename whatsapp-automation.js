const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ============================================================
// CONFIGURATION
// ============================================================
// Phone number MUST include country code, without '+' or leading zeros.
// Example: US +1 (234) 567-8900 -> '12345678900'
// Example: India +91 98765 43210 -> '919876543210'
const TARGET_PHONE_NUMBER = '+27600702302';
const MESSAGE_BODY = 'Main Menu';
// ============================================================

// Initialize WhatsApp Client with LocalAuth for persistent sessions
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false, // Run headful so you can see browser interaction
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});

// Helper Function: Click the "Options" button via Puppeteer DOM manipulation
async function clickOptionsButton() {
    try {
        const page = client.pupPage;
        if (!page) return;

        // Target selector matching title="Options" or role="button"
        const selector = 'button[title="Options"]';

        // Wait up to 5 seconds for button to render in DOM
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        console.log('Successfully clicked the "Options" button!');
    } catch (error) {
        console.error('Could not click "Options" button:', error.message);
    }
}

// Helper Function: Click a specific option from the opened list menu
async function selectListOptionByText(optionText) {
    try {
        const page = client.pupPage;
        if (!page) return;

        // 1. Click the "Options" button to reveal the list
        await clickOptionsButton();

        // 2. Locate and click the text matching optionText
        const itemXpath = `//span[text()='${optionText}']`;
        await page.waitForXPath(itemXpath, { timeout: 5000 });

        const [element] = await page.$x(itemXpath);
        if (element) {
            await element.click();
            console.log(`Successfully selected menu option: "${optionText}"`);
        }
    } catch (error) {
        console.error(`Failed to select option "${optionText}":`, error.message);
    }
}

// 1. Terminal QR Code Generation
client.on('qr', (qr) => {
    console.log('\n--- SCAN THIS QR CODE WITH YOUR WHATSAPP APP ---');
    qrcode.generate(qr, { small: true });
});

// 2. Authentication Confirmation
client.on('authenticated', () => {
    console.log('Session authenticated successfully!');
});

// 3. Client Ready Event
client.on('ready', async () => {
    console.log('WhatsApp Web Client is ready!');

    const chatId = `${TARGET_PHONE_NUMBER}@c.us`;

    try {
        console.log(`Sending message to ${TARGET_PHONE_NUMBER}...`);
        await client.sendMessage(chatId, MESSAGE_BODY);
        console.log(`Message sent successfully!`);
    } catch (error) {
        console.error('Failed to send message:', error);
    }
});

// 4. Incoming Message Listener & Bot Button Handler
client.on('message', async (msg) => {
    const contact = await msg.getContact();
    const senderName = contact.pushname || contact.name || msg.from;

    console.log(`\n[New Message] From: ${senderName} (${msg.from})`);
    console.log(`Type: ${msg.type}`);
    console.log(`Body: ${msg.body}`);

    // If message contains list buttons or option menus, automate interaction
    if (msg.type === 'list' || msg.type === 'buttons' || msg.hasMedia === false) {
        // Delay slightly to let WhatsApp Web render the action button in the DOM
        setTimeout(async () => {
            await clickOptionsButton();

            // Example: To click a specific menu choice inside the list, uncomment below:
            // await selectListOptionByText('Help');
        }, 1500);
    }
});

// 5. Disconnect Handler
client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
});

// Initialize the Client
client.initialize();