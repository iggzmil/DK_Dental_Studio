/**
 * DK Dental Studio - Common Functions
 * Contains utility functions used across the website
 */

// Initialize chat icon functionality and fix back-to-top button positioning
function initChatIcon() {
    // Don't create the chat icon on contact page
    if (document.body.classList.contains('contact-page')) {
        return;
    }

    // Create the button if it doesn't exist
    if (!document.getElementById('chatIconBtn')) {
        // Create the chat button container
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'chatIconContainer';

        // Create the button
        const button = document.createElement('a');
        button.id = 'chatIconBtn';
        button.title = 'Chat with us';
        button.href = 'contact-us.html?openChat=true';

        // Create icon
        const icon = document.createElement('i');
        icon.className = 'fas fa-comment';
        button.appendChild(icon);

        // Create text label
        const textLabel = document.createElement('div');
        textLabel.id = 'chatIconLabel';
        textLabel.textContent = 'Need help? Let\'s chat!';

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
        /* Chat Icon Container */
        #chatIconContainer {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            z-index: 9998;
            font-family: 'Fira Sans', sans-serif;
        }

        /* Chat Icon Button */
        #chatIconBtn {
            width: 40px;
            height: 40px;
            background-color: #0d6efd; /* Primary blue color */
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
            font-size: 18px;
            text-decoration: none;
            margin-top: 8px; /* Space between bubble and button */
        }

        #chatIconBtn:hover {
            background-color: #0b5ed7; /* Slightly darker blue */
            transform: translateY(-2px);
        }

        /* Chat Icon Label */
        #chatIconLabel {
            position: relative;
            background-color: #0d6efd;
            color: white;
            padding: 8px 16px;
            border-radius: 16px;
            font-size: 14px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            font-weight: 500;
        }
        
        /* Chat bubble tail */
        #chatIconLabel:after {
            content: '';
            position: absolute;
            bottom: -6px;
            right: 10px;
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid #0d6efd;
        }

        /* Back to Top Button - Override default styling */
        #back-to-top, .back-to-top {
            position: fixed !important;
            bottom: 20px !important;
            left: 20px !important; /* Position to the left edge of screen */
            width: 40px !important;
            height: 40px !important;
            background-color: #0576ee !important;
            color: white !important;
            border-radius: 50% !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 9997 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
            transition: all 0.3s ease !important;
            text-decoration: none !important;
            opacity: 0 !important; /* Start with opacity 0 */
            visibility: hidden !important; /* Start hidden */
        }
        #back-to-top.show, .back-to-top.show {
            opacity: 1 !important; /* Show when .show class is added */
            visibility: visible !important;
        }
        #back-to-top:hover, .back-to-top:hover {
            background-color: #0461c7 !important;
            transform: translateY(-2px) !important;
        }
        #back-to-top i, .back-to-top i {
            font-size: 18px !important;
            line-height: 40px !important;
        }

        @media (max-width: 768px) {
            #chatIconContainer {
                align-items: flex-end;
            }
            #chatIconLabel {
                font-size: 12px;
                padding: 6px 12px;
                margin-bottom: 8px;
            }
            #chatIconLabel:after {
                right: 10px;
            }
            #chatIconBtn {
                width: 40px;
                height: 40px;
                font-size: 16px;
            }
            #back-to-top, .back-to-top {
                width: 40px !important;
                height: 40px !important;
                left: 20px !important;
            }
            #back-to-top i, .back-to-top i {
                font-size: 16px !important;
            }
        }
        `;

        document.head.appendChild(style);

        // Add elements to container and append to document
        buttonContainer.appendChild(textLabel);
        buttonContainer.appendChild(button);
        document.body.appendChild(buttonContainer);
    }
}

// Initialize back-to-top button functionality
function initBackToTop() {
    // Get the back-to-top button
    const backToTop = document.getElementById('back-to-top') || document.querySelector('.back-to-top');

    if (backToTop) {
        // Initially hide the button
        backToTop.classList.remove('show');

        // Show/hide the button based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTop.classList.add('show');
            } else {
                backToTop.classList.remove('show');
            }
        });

        // Force initial check of scroll position
        window.dispatchEvent(new Event('scroll'));
    }
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initChatIcon();
    initBackToTop();
});
