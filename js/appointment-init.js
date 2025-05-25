/**
 * DK Dental Studio - Appointment Page Initialization
 * Extracted inline JavaScript for better maintainability
 */

$(document).ready(function() {
  // Initialize Bootstrap 5 navbar toggler
  $('.navbar-toggler').on('click', function() {
    var target = $(this).data('bs-target');
    $(target).toggleClass('show');
  });

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
        if (typeof window.loadCalendarForService === 'function') {
          window.loadCalendarForService('dentures');
        } else {
          // If the function isn't available yet, wait for it
          const checkInterval = setInterval(function() {
            if (typeof window.loadCalendarForService === 'function') {
              window.loadCalendarForService('dentures');
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
    // Check if booking confirmation is displayed - if so, don't load calendar
    if (window.bookingConfirmationDisplayed) {
      console.log('Skipping initial calendar load because booking confirmation is displayed');
      return;
    }

    // First try the normal method
    if (typeof window.loadCalendarForService === 'function') {
      console.log('Directly calling loadCalendarForService');
      window.loadCalendarForService('dentures');
    } else {
      console.log('Normal method not available, trying direct approach');
      // Direct approach - manually trigger calendar loading
      if (typeof window.initializeGoogleCalendar === 'function') {
        console.log('Calling initializeGoogleCalendar directly');
        window.initializeGoogleCalendar();
      } else {
        console.log('Google Calendar functions not available yet, waiting...');
        // Keep checking until the functions are available
        const checkForFunctions = setInterval(function() {
          if (typeof window.loadCalendarForService === 'function') {
            console.log('Functions now available, loading calendar');
            window.loadCalendarForService('dentures');
            clearInterval(checkForFunctions);
          }
        }, 1000);
      }
    }
  }, 2000); // Increased delay to ensure all scripts are fully loaded
});

// Service selection function
function selectService(element, service) {
  // Remove selected class from all service cards
  document.querySelectorAll('.service-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Add selected class to clicked card
  element.classList.add('selected');

  // Update appointment type text
  updateAppointmentTypeText(service);

  // Set the selected service in the window object for Google Calendar
  window.selectedService = service;

  // Show loading state first
  const calendarContainer = document.getElementById('appointment-calendar');
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
  if (typeof loadCalendarForService === 'function') {
    console.log('Loading calendar for service:', service);
    loadCalendarForService(service);
  } else {
    // Fallback if loadCalendarForService is not available
    calendarContainer.innerHTML = `
      <div class="alert alert-warning">
        <p>The calendar module is not loaded properly. Please try refreshing the page.</p>
      </div>
      <div class="text-center">
        <button class="btn btn-primary" onclick="window.location.reload()">Refresh Page</button>
      </div>
    `;
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

// Function to update the appointment type text
function updateAppointmentTypeText(service) {
  const appointmentTypeText = document.getElementById('appointment-type-text');
  if (appointmentTypeText) {
    let serviceName = 'Dentures Consultation';
    if (service === 'repairs') {
      serviceName = 'Repairs & Maintenance';
    } else if (service === 'mouthguards') {
      serviceName = 'Mouthguards';
    }
    appointmentTypeText.textContent = 'Booking: ' + serviceName;
  }
}
