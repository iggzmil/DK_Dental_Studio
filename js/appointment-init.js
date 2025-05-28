/**
 * DK Dental Studio - Appointment Page Initialization
 * Extracted inline JavaScript for better maintainability
 */

$(document).ready(function() {
  // Mobile navigation is handled by common-init.js - no need to duplicate here

  // Show admin info for development environment
  // In production, this should be removed or properly secured
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('dev')) {
    // Keep admin-info hidden
    // document.getElementById('admin-info').style.display = 'block';
  }

  // Check if we should auto-select dentures service
  const urlParams = new URLSearchParams(window.location.search);
  const autoSelectService = urlParams.get('service');

  if (autoSelectService === 'dentures') {
    // Wait for the page to fully load
    setTimeout(function() {
      // Check if fallback message is displayed by looking at DOM content
      const calendarContainer = document.getElementById('appointment-calendar');
      const isFallbackDisplayed = calendarContainer && 
        (calendarContainer.innerHTML.includes('Our Booking System is Temporarily Unavailable') ||
         calendarContainer.innerHTML.includes('Booking System is Temporarily Unavailable'));
      
      if (isFallbackDisplayed) {
        console.log('Fallback message detected in DOM, skipping auto-select service calendar load');
        return;
      }
      
      // Also check fallback flag if available (backup check)
      if (window.appState && window.appState.fallbackMessageDisplayed) {
        console.log('Fallback flag is set, skipping auto-select service calendar load');
        return;
      }
      
      // Auto-select the dentures card
      const denturesCard = document.querySelector('.service-card[data-service="dentures"]');
      if (denturesCard) {
        // Remove selected class from all cards
        document.querySelectorAll('.service-card').forEach(card => {
          card.classList.remove('selected');
        });

        // Add selected class to dentures card
        denturesCard.classList.add('selected');

        // Update appointment type text
        updateAppointmentTypeText('dentures');

        // Load the calendar directly (bypassing any basic mode)
        if (typeof loadCalendar === 'function') {
          loadCalendar('dentures');
        } else {
          // If the function isn't available yet, wait for it
          const checkInterval = setInterval(function() {
            // Check fallback state in DOM before attempting to load
            const calendarContainer = document.getElementById('appointment-calendar');
            const isFallbackDisplayed = calendarContainer && 
              (calendarContainer.innerHTML.includes('Our Booking System is Temporarily Unavailable') ||
               calendarContainer.innerHTML.includes('Booking System is Temporarily Unavailable'));
            
            if (isFallbackDisplayed) {
              console.log('Fallback message detected in DOM during auto-select wait, stopping attempts');
              clearInterval(checkInterval);
              return;
            }
            
            // Also check fallback flag if available (backup check)
            if (window.appState && window.appState.fallbackMessageDisplayed) {
              console.log('Fallback flag detected during auto-select wait, stopping attempts');
              clearInterval(checkInterval);
              return;
            }
            
            if (typeof loadCalendar === 'function') {
              loadCalendar('dentures');
              clearInterval(checkInterval);
            }
          }, 500);
        }
      }
    }, 500); // Give a small delay to ensure scripts are loaded
  }

  // Set copyright year (common functionality for all pages)
  const copyrightElement = document.getElementById('copyright');
  if (copyrightElement) {
    copyrightElement.textContent = new Date().getFullYear();
  }
});

// Direct calendar initialization script
document.addEventListener('DOMContentLoaded', function() {
  // Force direct loading of the calendar - this bypasses the normal initialization
  console.log('Force initializing calendar directly');

  // Set the global selectedService
  window.selectedService = 'dentures';

  // Give enough time for all scripts to load
  setTimeout(function() {
    // Check if fallback message is displayed by looking at DOM content
    const calendarContainer = document.getElementById('appointment-calendar');
    const isFallbackDisplayed = calendarContainer && 
      (calendarContainer.innerHTML.includes('Our Booking System is Temporarily Unavailable') ||
       calendarContainer.innerHTML.includes('Booking System is Temporarily Unavailable'));
    
    if (isFallbackDisplayed) {
      console.log('Fallback message detected in DOM, skipping automatic calendar load');
      return;
    }
    
    // Also check fallback flag if available (backup check)
    if (window.appState && window.appState.fallbackMessageDisplayed) {
      console.log('Fallback flag is set, skipping automatic calendar load');
      return;
    }
    
    // Check if booking confirmation is displayed - if so, don't load calendar
    if (window.bookingConfirmationDisplayed) {
      console.log('Skipping initial calendar load because booking confirmation is displayed');
      return;
    }

    // First try the normal method
    if (typeof loadCalendar === 'function') {
      console.log('Directly calling loadCalendar');
      loadCalendar('dentures');
    } else {
      console.log('Normal method not available, trying direct approach');
      // Direct approach - manually trigger calendar loading
      if (typeof initializeCalendar === 'function') {
        console.log('Calling initializeCalendar directly');
        initializeCalendar();
      } else {
        console.log('Google Calendar functions not available yet, waiting...');
        // Keep checking until the functions are available
        const checkForFunctions = setInterval(function() {
          // Check fallback state in DOM before attempting to load
          const calendarContainer = document.getElementById('appointment-calendar');
          const isFallbackDisplayed = calendarContainer && 
            (calendarContainer.innerHTML.includes('Our Booking System is Temporarily Unavailable') ||
             calendarContainer.innerHTML.includes('Booking System is Temporarily Unavailable'));
          
          if (isFallbackDisplayed) {
            console.log('Fallback message detected in DOM during wait, stopping calendar attempts');
            clearInterval(checkForFunctions);
            return;
          }
          
          // Also check fallback flag if available (backup check)
          if (window.appState && window.appState.fallbackMessageDisplayed) {
            console.log('Fallback flag detected during wait, stopping calendar attempts');
            clearInterval(checkForFunctions);
            return;
          }
          
          if (typeof loadCalendar === 'function') {
            console.log('Functions now available, loading calendar');
            loadCalendar('dentures');
            clearInterval(checkForFunctions);
          }
        }, 1000);
      }
    }
  }, 2000); // Increased delay to ensure all scripts are fully loaded
});

// Service selection function
function selectService(element, service) {
  console.log(`selectService called with service: ${service}`);
  
  // Check if fallback message is displayed by looking at the DOM content
  const calendarContainer = document.getElementById('appointment-calendar');
  const isFallbackDisplayed = calendarContainer && 
    (calendarContainer.innerHTML.includes('Our Booking System is Temporarily Unavailable') ||
     calendarContainer.innerHTML.includes('Booking System is Temporarily Unavailable'));
  
  if (isFallbackDisplayed) {
    console.log('Fallback message detected in DOM, skipping calendar manipulation');
    
    // Still update the service selection UI, but don't touch the calendar area
    document.querySelectorAll('.service-card').forEach(card => {
      card.classList.remove('selected');
      card.setAttribute('aria-pressed', 'false');
    });
    
    element.classList.add('selected');
    element.setAttribute('aria-pressed', 'true');
    
    updateAppointmentTypeText(service);
    window.selectedService = service;
    
    return; // Exit early - don't manipulate calendar
  }
  
  // Also check the appState fallback flag if available (backup check)
  if (window.appState && window.appState.fallbackMessageDisplayed) {
    console.log('Fallback flag is set, skipping calendar manipulation');
    
    // Still update the service selection UI, but don't touch the calendar area
    document.querySelectorAll('.service-card').forEach(card => {
      card.classList.remove('selected');
      card.setAttribute('aria-pressed', 'false');
    });
    
    element.classList.add('selected');
    element.setAttribute('aria-pressed', 'true');
    
    updateAppointmentTypeText(service);
    window.selectedService = service;
    
    return; // Exit early - don't manipulate calendar
  }
  
  // Remove selected class from all service cards
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.remove('selected');
    card.setAttribute('aria-pressed', 'false');
  });

  // Add selected class to clicked card
  element.classList.add('selected');
  element.setAttribute('aria-pressed', 'true');

  // Update appointment type text
  updateAppointmentTypeText(service);

  // Set the selected service in the window object for Google Calendar
  window.selectedService = service;
  console.log(`Service set to: ${window.selectedService}`);

  // Show loading state first
  if (calendarContainer) {
    calendarContainer.innerHTML = `
      <div class="calendar-loading">
        <div class="spinner"></div>
        <p>Loading appointment calendar for ${getServiceName(service)}...</p>
      </div>
    `;
  }

  // Ensure we're using the token that was already fetched on page load
  if (typeof window.serverAccessToken !== 'undefined' && window.serverAccessToken) {
    console.log('Using existing token for service change');

    // If we already have a token, apply it before loading the calendar
    if (window.gapi && window.gapi.client) {
      window.gapi.client.setToken({ access_token: window.serverAccessToken });
    }
  }

  // Update calendar with selected service - make sure we're using the already authorized API
  if (typeof loadCalendar === 'function') {
    console.log('Loading calendar for service:', service);
    loadCalendar(service);
  } else {
    // Fallback if loadCalendar is not available
    console.log('loadCalendar not available, showing technical difficulties');
    if (calendarContainer) {
      showTechnicalDifficulties('Calendar module not loaded properly');
    }
  }
}

// Keyboard navigation handler for service cards
function handleServiceCardKeydown(event, element, service) {
  // Handle Enter and Space key presses
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectService(element, service);
  }
  // Handle arrow key navigation
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    const serviceCards = Array.from(document.querySelectorAll('.service-card'));
    const currentIndex = serviceCards.indexOf(element);
    let nextIndex;
    
    if (event.key === 'ArrowLeft') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : serviceCards.length - 1;
    } else {
      nextIndex = currentIndex < serviceCards.length - 1 ? currentIndex + 1 : 0;
    }
    
    serviceCards[nextIndex].focus();
  }
}

// Helper function to get service name
function getServiceName(service) {
  switch (service) {
    case 'dentures':
      return 'Dentures Consultation';
    case 'repairs':
      return 'Repairs & Maintenance';
    case 'mouthguards':
      return 'Mouthguards Consultation';
    default:
      return 'Appointment';
  }
}

// Helper function to update appointment type text
function updateAppointmentTypeText(service) {
  const appointmentTypeText = document.getElementById('appointment-type-text');
  if (appointmentTypeText) {
    appointmentTypeText.textContent = `Booking: ${getServiceName(service)}`;
  }
}
