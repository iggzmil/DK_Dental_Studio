/**
 * DK Dental Studio Chat Widget Initialization
 * This script initializes the chat widget with the appropriate configuration
 */

document.addEventListener('DOMContentLoaded', function() {
  // Only initialize the chat widget on the contact-us page
  if (!document.body.classList.contains('contact-page')) {
    // Add the contact-page class to the body if we're on the contact-us page
    if (window.location.pathname.includes('contact-us')) {
      document.body.classList.add('contact-page');
    } else {
      // We're not on the contact page, so don't initialize the chat widget
      return;
    }
  }

  // Check if we need to auto-open the chat
  const urlParams = new URLSearchParams(window.location.search);
  const shouldOpenChat = urlParams.get('openChat') === 'true';

  // Check if we're on mobile
  const isMobile = window.innerWidth <= 768;

  // Only auto-expand if coming from chat icon, not just because it's mobile
  const shouldAutoExpand = shouldOpenChat;

  // Create chat container if it doesn't exist
  let chatContainer = document.getElementById('chat-container');
  if (!chatContainer) {
    chatContainer = document.createElement('div');
    chatContainer.id = 'chat-container';
    document.body.appendChild(chatContainer);
  }

  // Initialize the chat widget with DK Dental Studio specific configuration
  const chatWidget = new DKDChatWidget({
    target: 'chat-container',
    webhookUrl: 'https://n8n.aaa-city.com/webhook/ab6aa64d-a2e5-40d4-9abb-4c8500a19d49/chat',
    minimized: !shouldAutoExpand, // Auto-expand if openChat=true or on mobile
    minimizedContent: `
      <img src="images/chat-icon.svg" alt="Chat Icon" style="width: 20px; height: 20px;">
      <span>Chat with DK Dental</span>
    `,
    initialMessages: [
      "👋 Hi there! I'm the DK Dental Studio virtual assistant.",
      "How can I help you today? Feel free to ask about our services, pricing, or book a consultation."
    ],
    metadata: {
      source: 'website',
      page: window.location.pathname.split('/').pop().split('.')[0] || 'home',
      fromChatIcon: shouldOpenChat,
      isMobile: isMobile,
      autoExpanded: shouldAutoExpand
    },
    fallbackResponses: {
      default: "I'm sorry, I'm having trouble connecting right now. Please try again later or contact us directly at info@dkdental.au.",
      help: "I'd be happy to help! You can ask me about our dental services, pricing, or book a consultation. If you need immediate assistance, please call us at (02) 9398 7578.",
      pricing: "Our pricing varies depending on the specific treatment you need. For a personalized quote, we recommend booking a free consultation where we can assess your needs and provide detailed pricing information.",
      services: "We offer a range of dental services including dentures, mouthguards, and more. Would you like more information about a specific service?"
    }
  });



  // Create chat icon if it doesn't exist
  if (!document.querySelector('link[href*="chat-icon.svg"]')) {
    const chatIconLink = document.createElement('link');
    chatIconLink.rel = 'preload';
    chatIconLink.as = 'image';
    chatIconLink.href = 'images/chat-icon.svg';
    document.head.appendChild(chatIconLink);
  }

  // Create the chat icon SVG if it doesn't exist
  fetch('images/chat-icon.svg')
    .then(response => {
      if (response.status === 404) {
        // Create the chat icon SVG file if it doesn't exist
        const chatIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>`;

        // Create a Blob from the SVG string
        const blob = new Blob([chatIconSvg], { type: 'image/svg+xml' });

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create an image element to download the SVG
        const img = new Image();
        img.src = url;

        // Log that we're creating the chat icon
        console.log('Creating chat icon SVG');
      }
    })
    .catch(error => {
      console.error('Error checking for chat icon:', error);
    });
});
