const { Translate } = require('@google-cloud/translate').v2;
const config = require('./config');  

// Configure the Google Cloud Translation API
const translate = new Translate({ key: process.env.GOOGLE_API_KEY });

// Function to detect language and translate text if not German
async function detectAndTranslateText(text, targetLanguage) {
  try {
    let [detections] = await translate.detect(text);
    const detection = Array.isArray(detections) ? detections[0] : detections;

    // Check if detected language is already German
    if (detection.language === 'de') {
      return null; // Return null if the message is already in German
    }

    let [translations] = await translate.translate(text, targetLanguage);
    return Array.isArray(translations) ? translations[0] : translations;
  } catch (error) {
    console.error('Error during translation or detection:', error);
    return text;  // Return the original text if detection or translation fails
  }
}

// Listener setup function
function setupTranslationListener(client, channelId) {
  client.on('messageCreate', async message => {
    // Check if the message is from the bot itself but not from other bots
    if (message.channel.id === channelId && message.author.id !== client.user.id) {
      const translatedText = await detectAndTranslateText(message.content, 'de');

      // Send translated text if translation was necessary and successful
      if (translatedText) {
        const roleMention = `<@&${config.revengerRoleId}>`;  // Constructs the role mention using the role ID from config
        message.channel.send(`${roleMention} \n\n${translatedText}`);
      }
    }
  });
}

module.exports = { setupTranslationListener };
