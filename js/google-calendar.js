/**
 * Google Calendar Integration for DK Dental Studio Appointment Booking
 */

// Debug mode - set to true to show detailed debug information
const DEBUG_MODE = true;

// Set default selected service on script load
window.selectedService = 'dentures';

// Google API credentials
// const GOOGLE_API_KEY = 'AIzaSyDFoNqB7BIuoZrUQDRVhnpVLjXsUgT-6Ow'; // Replace with your API key - Not used with server-side OAuth
const GOOGLE_CLIENT_ID = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
const CALENDAR_ID = {
  'dentures': 'info@dkdental.au',
  'repairs': 'info@dkdental.au',
  'mouthguards': 'info@dkdental.au'
};

// Google API discovery docs and scope
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

// Default service durations in minutes
const SERVICE_DURATION = {
  'dentures': 60,
  'repairs': 60,
  'mouthguards': 60
};

// Store selected service
let selectedDateTime = null;
let gapi = null;
let tokenClient = null;
let serverAccessToken = null;
let isInitialized = false;
let calendarInitialized = false;
let isInitializing = false; // Add a flag to track when initialization is in progress

// Store all availability data for current and next month
let availabilityData = {
  currentMonth: {},
  nextMonth: {}
};

// Set flag for data loading status
let isLoadingAvailability = false;
let availabilityLoaded = false;

// Global token fetching promise to prevent duplicate requests
let tokenFetchPromise = null;

// Keep track of the availability loading promise
let availabilityLoadingPromise = null;

/**
 * Debug logging function - only logs when DEBUG_MODE is true
 */
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log('[Calendar Debug]', ...args);
    
    // Also add to debug display if it exists
    const debugLog = document.getElementById('calendar-debug-log');
    if (debugLog) {
      const now = new Date();
      const timestamp = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
      
      const logEntry = document.createElement('div');
      logEntry.innerHTML = `<span style="color:#999;">${timestamp}</span> ${message}`;
      debugLog.appendChild(logEntry);
      
      // Auto-scroll to bottom
      debugLog.scrollTop = debugLog.scrollHeight;
    }
  }
}

/**
 * Add debug display to page
 */
function addDebugDisplay() {
  if (DEBUG_MODE) {
    const debugDiv = document.createElement('div');
    debugDiv.id = 'calendar-debug';
    debugDiv.style.position = 'fixed';
    debugDiv.style.bottom = '20px';
    debugDiv.style.right = '20px';
    debugDiv.style.backgroundColor = '#f5f5f5';
    debugDiv.style.border = '1px solid #ddd';
    debugDiv.style.padding = '10px';
    debugDiv.style.borderRadius = '5px';
    debugDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    debugDiv.style.zIndex = '9999';
    debugDiv.style.maxHeight = '300px';
    debugDiv.style.overflowY = 'auto';
    debugDiv.style.fontSize = '12px';
    debugDiv.style.fontFamily = 'monospace';
    debugDiv.style.display = 'block';
    
    const header = document.createElement('div');
    header.innerHTML = '<h6 style="margin: 0 0 5px 0;"><i class="fas fa-bug"></i> Calendar Debug</h6>';
    header.style.cursor = 'pointer';
    header.onclick = function() {
      const content = document.getElementById('calendar-debug-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    };
    
    const content = document.createElement('div');
    content.id = 'calendar-debug-content';
    content.style.display = 'block'; // Show debug content by default
    
    const log = document.createElement('div');
    log.id = 'calendar-debug-log';
    
    const actions = document.createElement('div');
    actions.style.marginTop = '10px';
    actions.innerHTML = `
      <button style="font-size: 10px; padding: 2px 5px; margin-right: 5px;" onclick="clearDebugLog()">Clear Log</button>
      <button style="font-size: 10px; padding: 2px 5px;" onclick="reloadCalendar()">Reload Calendar</button>
    `;
    
    content.appendChild(log);
    content.appendChild(actions);
    debugDiv.appendChild(header);
    debugDiv.appendChild(content);
    
    document.body.appendChild(debugDiv);
    
    // Add global functions
    window.clearDebugLog = function() {
      document.getElementById('calendar-debug-log').innerHTML = '';
    };
    
    window.reloadCalendar = function() {
      if (window.selectedService) {
        window.loadCalendarForService(window.selectedService);
      }
    };
  }
}

/**
 * Format a date string for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Format a time string for display
 */
function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  
  if (hour === 0) {
    return `12:${minutes}am`;
  } else if (hour < 12) {
    return `${hour}:${minutes}am`;
  } else if (hour === 12) {
    return `12:${minutes}pm`;
  } else {
    return `${hour - 12}:${minutes}pm`;
  }
}

/**
 * On page load, initialize Google API client
 */
document.addEventListener('DOMContentLoaded', function() {
  // Add debug display
  addDebugDisplay();
  
  // Load the Google API client
  debugLog('Page loaded, initializing Google Calendar integration');
  
  // Set the selected service if not already set
  if (!window.selectedService) {
    window.selectedService = 'dentures';
  }
  
  // Initialize once and prevent multiple initializations
  if (!isInitialized && !isInitializing) {
    initializeCalendar();
  }
});

/**
 * Initialize the calendar system
 */
function initializeCalendar() {
  // Prevent multiple initializations
  if (isInitializing) {
    debugLog('Calendar initialization already in progress, skipping duplicate initialization');
    return;
  }
  
  isInitializing = true;
  debugLog('Initializing calendar system');
  
  // Get gapi from window
  gapi = window.gapi;
  if (!gapi) {
    debugLog('Google API client not available');
    isInitializing = false;
    showBasicCalendar();
    return;
  }
  
  // Load the API client and auth libraries
  gapi.load('client', function() {
    debugLog('Google API client loaded');
    
    // Initialize the API client
    gapi.client.init({
      discoveryDocs: DISCOVERY_DOCS,
    }).then(() => {
      debugLog('API client initialized, fetching token');
      
      // Fetch token and load calendar
      fetchServerAccessToken()
        .then(token => {
          debugLog('Token fetched, loading calendar');
          serverAccessToken = token;
          window.serverAccessToken = token;
          
          // Set the token for API calls
          gapi.client.setToken({ access_token: token });
          
          // Load all availability data first
          loadAllAvailabilityData().then(() => {
            // Load the calendar with the current selected service
            isInitialized = true;
            calendarInitialized = true;
            isInitializing = false;
            loadCalendar(window.selectedService);
          }).catch(err => {
            debugLog('Failed to load availability data:', err);
            isInitialized = true;
            isInitializing = false;
            showBasicCalendar();
          });
        })
        .catch(err => {
          debugLog('Token fetch failed:', err);
          isInitializing = false;
          showBasicCalendar();
        });
    })
    .catch(err => {
      debugLog('API client initialization failed:', err);
      isInitializing = false;
      showBasicCalendar();
    });
  });
}

/**
 * Fetch access token from server
 */
function fetchServerAccessToken() {
  // If we already have a token fetch in progress, return that promise
  if (tokenFetchPromise) {
    debugLog('Reusing existing token fetch promise');
    return tokenFetchPromise;
  }
  
  // Create a new token fetch promise
  tokenFetchPromise = new Promise((resolve, reject) => {
    debugLog('Fetching server access token...');
    console.log('Attempting to fetch server access token...');
    
    // Use relative path for better compatibility
    let apiUrl = 'script/calendar/get-access-token.php';
    
    // Check if we're in a subdirectory and adjust path
    if (window.location.pathname.includes('/appointment.html')) {
      apiUrl = 'script/calendar/get-access-token.php';
    } else {
      // Handle other potential path situations
      apiUrl = 'script/calendar/get-access-token.php';
    }
    
    console.log('Token fetch URL:', apiUrl);
    debugLog('Token fetch URL:', apiUrl);
    
    const cacheBuster = new Date().getTime();
    const urlWithNoCaching = apiUrl + '?nocache=' + cacheBuster;
    
    fetch(urlWithNoCaching, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      credentials: 'same-origin'
    })
      .then(response => {
        debugLog('Token fetch response status:', response.status);
        console.log('Token fetch response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch token: ${response.status}`);
        }
        return response.text().then(text => {
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error('Invalid JSON in token response:', text);
            throw new Error('Invalid JSON response from token endpoint');
          }
        });
      })
      .then(data => {
        if (data.success && data.access_token) {
          console.log('Successfully retrieved access token');
          return data.access_token;
        } else {
          console.error('Token response did not contain valid access token:', data);
          throw new Error(data.error || 'No access token in response');
        }
      })
      .then(token => {
        // Clear the promise reference after a short delay to prevent immediate duplicate requests
        // but allow future refresh operations
        setTimeout(() => {
          tokenFetchPromise = null;
        }, 5000);
        
        resolve(token);
      })
      .catch(error => {
        console.error('Error fetching token:', error);
        
        // Clear the promise on error so future attempts can be made
        tokenFetchPromise = null;
        
        reject(error);
      });
  });
  
  return tokenFetchPromise;
}

/**
 * Load the calendar for the selected service
 */
function loadCalendar(service) {
  debugLog('Loading calendar for service:', service);
  
  // Store selected service
  window.selectedService = service;
  
  // Get the calendar container
  const calendarContainer = document.getElementById('appointment-calendar');
  if (!calendarContainer) {
    debugLog('ERROR: Calendar container not found!');
    return;
  }
  
  // Show loading state
  calendarContainer.innerHTML = `
    <div class="calendar-loading">
      <div class="spinner"></div>
      <p>Loading appointment calendar...</p>
    </div>
  `;
  
  // If initialization is not complete, wait for it
  if (!isInitialized && isInitializing) {
    debugLog('Waiting for initialization to complete before loading calendar');
    const checkInterval = setInterval(() => {
      if (isInitialized) {
        clearInterval(checkInterval);
        loadCalendar(service);
      }
    }, 500);
    
    // Add a timeout to prevent infinite waiting
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!isInitialized) {
        debugLog('Initialization timeout, showing basic calendar');
        showBasicCalendar();
      }
    }, 10000);
    
    return;
  }
  
  // Wait until availability data is loaded
  if (!availabilityLoaded && isInitialized) {
    debugLog('Waiting for availability data to load');
    
    // If not already loading, start loading
    if (!isLoadingAvailability) {
      loadAllAvailabilityData()
        .then(() => {
          debugLog('Availability data loaded, rendering calendar');
          renderCalendar(service);
        })
        .catch(err => {
          debugLog('Failed to load availability data:', err);
          renderCalendar(service); // Render with fallback data
        });
    } else {
      // Check every 500ms if data is loaded
      const checkInterval = setInterval(() => {
        if (availabilityLoaded) {
          clearInterval(checkInterval);
          debugLog('Availability data loaded, rendering calendar');
          renderCalendar(service);
        }
      }, 500);
      
      // Timeout after 15 seconds instead of 10
      setTimeout(() => {
        clearInterval(checkInterval);
        debugLog('Timeout waiting for availability data, rendering calendar with fallback');
        renderCalendar(service);
      }, 15000);
    }
  } else {
    // Data already loaded, render immediately
    renderCalendar(service);
  }
  
  // Update UI to match selected service
  updateServiceSelectionUI(service);
}

/**
 * Render the calendar UI with available data
 */
function renderCalendar(service) {
  // Get the calendar container
  const calendarContainer = document.getElementById('appointment-calendar');
  if (!calendarContainer) {
    debugLog('ERROR: Calendar container not found!');
    return;
  }
  
  // Get today's date for initial view
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  
  // Create and render the calendar
  calendarContainer.innerHTML = createCalendarHTML(month, year, service);
  
  // Setup calendar interactions
  setupCalendarInteraction();
  
  // Mark dates with available slots
  markAvailableDates();
  
  // Add appropriate notice based on calendar mode
  const notice = document.createElement('div');
  
  if (availabilityLoaded) {
    notice.className = 'alert alert-success mb-4';
    notice.innerHTML = `
      <p><strong>Calendar loaded successfully.</strong> Please select a date to see available appointment times.</p>
      <p class="mb-0 small">Green dates have available slots. Click on a date to view available time slots.</p>
    `;
    debugLog('Calendar showing in connected mode with real availability data');
  } else {
    notice.className = 'alert alert-warning mb-4';
    notice.innerHTML = `
      <p><strong>Note:</strong> The calendar is showing all possible appointment times. Your booking will be confirmed by our staff after submission.</p>
      <p class="mb-0 small">All weekdays show available slots in this mode. Select any date to view available times.</p>
    `;
    debugLog('Calendar showing in basic mode - all weekdays available');
  }
  
  if (calendarContainer.firstChild) {
    calendarContainer.insertBefore(notice, calendarContainer.firstChild);
  } else {
    calendarContainer.appendChild(notice);
  }
}

/**
 * Mark calendar dates that have available slots
 */
function markAvailableDates() {
  // Get all calendar day elements
  const calendarDays = document.querySelectorAll('.calendar-day:not(.empty)');
  
  // Process each day
  calendarDays.forEach(dayElement => {
    // Get the date from the day element
    const dateString = dayElement.getAttribute('data-date');
    if (!dateString) return;
    
    // Check if this is a weekend
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Check if this is a past date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = date < today;
    
    // Skip past dates and weekends
    if (isPast) {
      dayElement.classList.add('past');
      return;
    }
    
    if (isWeekend) {
      dayElement.classList.add('weekend');
      return;
    }
    
    // Skip if already marked
    if (dayElement.classList.contains('past') || dayElement.classList.contains('weekend')) {
      return;
    }
    
    // Check if this date has available slots
    const hasAvailableSlots = hasAvailableSlotsForDate(dateString);
    
    // Mark as available or fully booked
    if (hasAvailableSlots) {
      dayElement.classList.add('available');
      
      // Add availability indicator
      const availabilityDiv = dayElement.querySelector('.availability');
      if (availabilityDiv) {
        availabilityDiv.textContent = 'Available';
      }
    } else {
      // In basic mode, all weekdays should be available
      if (!availabilityLoaded) {
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          dayElement.classList.add('available');
          
          // Add availability indicator
          const availabilityDiv = dayElement.querySelector('.availability');
          if (availabilityDiv) {
            availabilityDiv.textContent = 'Available';
          }
          return;
        }
      }
      
      // Only mark as fully booked in connected mode
      dayElement.classList.add('fully-booked');
      
      // Update availability indicator
      const availabilityDiv = dayElement.querySelector('.availability');
      if (availabilityDiv) {
        availabilityDiv.textContent = 'Fully Booked';
        availabilityDiv.style.color = '#f44336';
      }
    }
  });
  
  // Log overall availability for debugging
  if (availabilityLoaded) {
    const availableDays = document.querySelectorAll('.calendar-day.available').length;
    const bookedDays = document.querySelectorAll('.calendar-day.fully-booked').length;
    const weekendDays = document.querySelectorAll('.calendar-day.weekend').length;
    debugLog(`Calendar showing ${availableDays} available days and ${bookedDays} fully booked days (${weekendDays} weekend days)`);
  }
}

/**
 * Check if a date has available slots
 */
function hasAvailableSlotsForDate(dateString) {
  // In fallback/basic mode, all weekdays should show as available
  if (!availabilityLoaded) {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    // Monday to Friday (1-5) are always available in basic mode
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  
  // When properly connected to Google Calendar, check the actual availability data
  // Get the combined data from both months
  const monthData = {
    ...availabilityData.currentMonth,
    ...availabilityData.nextMonth
  };
  
  // Check if this date exists in the data
  const hasData = dateString in monthData;
  
  // Check if this date has available slots
  const hasSlots = hasData && monthData[dateString] && monthData[dateString].length > 0;
  
  // Debug the availability status for this date
  debugLog(`Checking availability for ${dateString}: hasData=${hasData}, hasSlots=${hasSlots}`);
  
  // If we have data for this date, return whether it has slots
  if (hasData) {
    return hasSlots;
  }
  
  // If we don't have data for this date (which might happen for dates at edges of the period),
  // default to showing as available for weekdays
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Set up interaction for calendar days and time slots
 */
function setupCalendarInteraction() {
  // Define the global functions for calendar navigation
  window.prevMonth = function() {
    // Get the current displayed month and year
    const headerText = document.querySelector('.calendar-header h3').textContent;
    const [monthName, year] = headerText.split(' ');
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    
    let month = monthNames.indexOf(monthName);
    let newYear = parseInt(year, 10);
    
    // Calculate previous month
    if (month === 0) {
      month = 11;
      newYear--;
    } else {
      month--;
    }
    
    // Don't allow navigating to past months
    const today = new Date();
    if (newYear < today.getFullYear() || (newYear === today.getFullYear() && month < today.getMonth())) {
      alert('Cannot navigate to past months');
      return;
    }
    
    // Re-render the calendar
    const calendarContainer = document.getElementById('appointment-calendar');
    
    // Get the success message if it exists (to preserve it)
    const successMessage = calendarContainer.querySelector('.alert');
    
    // Re-render the calendar
    calendarContainer.innerHTML = createCalendarHTML(month, newYear, window.selectedService);
    
    // Re-add the success message if it existed
    if (successMessage) {
      calendarContainer.insertBefore(successMessage, calendarContainer.firstChild);
    }
    
    // Re-setup the interactions
    setupCalendarInteraction();
    
    // Mark available dates
    markAvailableDates();
    
    // Clear time slots and booking form
    document.getElementById('time-slots-container').innerHTML = '';
    const bookingForm = document.getElementById('booking-form-container');
    if (bookingForm) {
      bookingForm.style.display = 'none';
    }
  };
  
  window.nextMonth = function() {
    // Get the current displayed month and year
    const headerText = document.querySelector('.calendar-header h3').textContent;
    const [monthName, year] = headerText.split(' ');
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    
    let month = monthNames.indexOf(monthName);
    let newYear = parseInt(year, 10);
    
    // Calculate next month
    if (month === 11) {
      month = 0;
      newYear++;
    } else {
      month++;
    }
    
    // Limit how far in the future users can book (for example, 3 months)
    const today = new Date();
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 3, 1);
    
    if (newYear > maxDate.getFullYear() || 
        (newYear === maxDate.getFullYear() && month > maxDate.getMonth())) {
      alert('Cannot book appointments more than 3 months in advance');
      return;
    }
    
    // Re-render the calendar
    const calendarContainer = document.getElementById('appointment-calendar');
    
    // Get the success message if it exists (to preserve it)
    const successMessage = calendarContainer.querySelector('.alert');
    
    // Re-render the calendar
    calendarContainer.innerHTML = createCalendarHTML(month, newYear, window.selectedService);
    
    // Re-add the success message if it existed
    if (successMessage) {
      calendarContainer.insertBefore(successMessage, calendarContainer.firstChild);
    }
    
    // Re-setup the interactions
    setupCalendarInteraction();
    
    // Mark available dates
    markAvailableDates();
    
    // Clear time slots and booking form
    document.getElementById('time-slots-container').innerHTML = '';
    const bookingForm = document.getElementById('booking-form-container');
    if (bookingForm) {
      bookingForm.style.display = 'none';
    }
  };
  
  // Define the function to show time slots
  window.showTimeSlots = function(dayElement) {
    // Clear any previously selected days
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Mark this day as selected
    dayElement.classList.add('selected');
    
    // Get the date from the day element
    const dateString = dayElement.getAttribute('data-date');
    
    // Show loading state
    const timeSlotsContainer = document.getElementById('time-slots-container');
    if (!timeSlotsContainer) {
      debugLog('ERROR: Time slots container not found!');
      return;
    }
    
    timeSlotsContainer.innerHTML = `
      <h4 class="text-center">Loading available times...</h4>
      <div class="text-center">
          <div class="spinner"></div>
      </div>
    `;

    // Log the mode and date for debugging
    debugLog(`Loading time slots for ${dateString} in ${availabilityLoaded ? 'connected' : 'basic'} mode`);
    
    // Get time slots from pre-loaded data
    const timeSlots = getTimeSlotsFromCache(dateString);
    
    // Additional logging to diagnose issues
    if (availabilityLoaded && (!timeSlots || timeSlots.length === 0)) {
      const dateData = availabilityData.currentMonth[dateString] || availabilityData.nextMonth[dateString];
      debugLog(`No slots found in cache for ${dateString}. Raw data:`, JSON.stringify(dateData));
    }
    
    // Show the time slots
    timeSlotsContainer.innerHTML = createTimeSlotsHTML(dateString, timeSlots);
    
    // Scroll to the time slots
    timeSlotsContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Clear any booking form
    const bookingFormContainer = document.getElementById('booking-form-container');
    if (bookingFormContainer) {
      bookingFormContainer.style.display = 'none';
    }
  };
}

/**
 * Get time slots from the pre-loaded cache
 */
function getTimeSlotsFromCache(dateString) {
  // If data isn't loaded yet, use fallback
  if (!availabilityLoaded) {
    return getFallbackTimeSlots(dateString);
  }
  
  // Use combined data from both months to ensure we don't miss any data
  const combinedData = {
    ...availabilityData.currentMonth,
    ...availabilityData.nextMonth
  };
  
  // Return the cached slots or empty array if none
  // Make sure we're actually using the filtered slots from the API response
  const availableSlots = combinedData[dateString] || [];
  
  debugLog(`Retrieved ${availableSlots.length} slots for ${dateString} from cache`);
  
  return availableSlots;
}

/**
 * Get fallback time slots for a date
 */
function getFallbackTimeSlots(dateString) {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Business hours
  let allSlots = getAllPossibleTimeSlots(date);
  
  // Apply default busy periods
  return createDefaultBusyPeriodsForDay(allSlots, dayOfWeek);
}

/**
 * Create HTML for time slots
 */
function createTimeSlotsHTML(dateString, timeSlots) {
  const date = new Date(dateString);
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = formatDate(dateString);
  
  // If no time slots available
  if (!timeSlots || timeSlots.length === 0) {
    return `
      <h4 class="text-center mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
      <div class="alert alert-info">
        <p class="text-center mb-0">No available appointments for this date. Please select another date.</p>
      </div>
    `;
  }
  
  // Show available slots
  let html = `
    <h4 class="text-center mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
  `;
  
  // Add a notice if in basic mode
  if (!availabilityLoaded) {
    html += `
      <div class="alert alert-warning mb-3">
        <p class="mb-0"><small>Note: Calendar is in basic mode. These times need to be confirmed by our staff.</small></p>
      </div>
    `;
  }
  
  html += `<div class="time-slots-grid">`;
  
  timeSlots.forEach(slot => {
    html += `
      <div class="time-slot" onclick="selectTimeSlot(this, '${dateString}', '${slot}')">
        ${formatTime(slot)}
      </div>
    `;
  });
  
  html += `</div>`;
  
  // Log for debugging
  debugLog(`Displaying ${timeSlots.length} time slots for ${dateString}`);
  
  return html;
}

/**
 * Show basic calendar without API integration
 */
function showBasicCalendar() {
  debugLog('Showing basic calendar');
  
  // Get the service to use for the calendar
  const service = window.selectedService || 'dentures';
  
  // Create fallback data for basic mode
  createFallbackAvailabilityData();
  
  // Render the calendar
  renderCalendar(service);
  
  // Show a network connectivity notice
  const calendarContainer = document.getElementById('appointment-calendar');
  if (calendarContainer) {
    const notice = document.createElement('div');
    notice.className = 'alert alert-warning mb-4';
    notice.innerHTML = `
      <p><strong>Note:</strong> The calendar is in basic mode. All weekday time slots are shown as available. 
      Your booking will need to be confirmed by our staff before it is finalized.</p>
    `;
    
    if (calendarContainer.firstChild) {
      calendarContainer.insertBefore(notice, calendarContainer.firstChild);
    } else {
      calendarContainer.appendChild(notice);
    }
  }
}

/**
 * Create fallback availability data when API access fails
 */
function createFallbackAvailabilityData() {
  debugLog('Creating fallback availability data');
  
  // Get dates for the next 3 months
  const today = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(today.getMonth() + 3);
  
  // Create fallback data
  const fallbackData = createFallbackPeriodData(today, threeMonthsLater);
  
  // Store in both current and next month objects for compatibility
  availabilityData.currentMonth = fallbackData;
  availabilityData.nextMonth = fallbackData;
  
  // Mark as loaded but in fallback mode
  availabilityLoaded = false;
  
  // Log detailed information about the fallback data
  const dateCount = Object.keys(fallbackData).length;
  const exampleDate = Object.keys(fallbackData)[0];
  const exampleSlots = exampleDate ? fallbackData[exampleDate].length : 0;
  
  debugLog(`Created fallback data with ${dateCount} dates, each with approx. ${exampleSlots} slots`);
  debugLog('Calendar is in basic mode - all weekdays will show as available');
}

/**
 * Update UI to match selected service
 */
function updateServiceSelectionUI(service) {
  // Update service cards UI
  document.querySelectorAll('.service-card').forEach(card => {
    if (card.dataset.service === service) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  
  // Update appointment type text
  const appointmentTypeText = document.getElementById('appointment-type-text');
  if (appointmentTypeText) {
    appointmentTypeText.textContent = 'Booking: ' + getServiceName(service);
  }
}

/**
 * Expose the loadCalendarForService function globally
 */
window.loadCalendarForService = function(service) {
  debugLog('loadCalendarForService called for', service);
  
  // Only reload data if service changed
  const serviceChanged = window.selectedService !== service;
  
  // Update the global selected service
  window.selectedService = service;
  
  // Update UI
  updateServiceSelectionUI(service);
  
  // Show loading state
  const calendarContainer = document.getElementById('appointment-calendar');
  if (!calendarContainer) {
    debugLog('ERROR: Calendar container not found!');
    return;
  }
  
  calendarContainer.innerHTML = `
    <div class="calendar-loading">
      <div class="spinner"></div>
      <p>Loading appointment calendar for ${getServiceName(service)}...</p>
    </div>
  `;
  
  // If initialization is not complete, we need to wait
  if (!isInitialized) {
    if (!isInitializing) {
      // Start initialization if not already in progress
      initializeCalendar();
    } else {
      debugLog('Initialization already in progress, waiting before loading service');
    }
    return;
  }
  
  // If service changed, we need to reload availability data
  if (serviceChanged && calendarInitialized) {
    debugLog('Service changed, reloading availability data');
    
    // Reset availability data
    availabilityData = {
      currentMonth: {},
      nextMonth: {}
    };
    availabilityLoaded = false;
    
    // Reload availability data
    loadAllAvailabilityData()
      .then(() => {
        debugLog('Availability data reloaded for new service');
        renderCalendar(service);
      })
      .catch(err => {
        debugLog('Failed to reload availability data for new service:', err);
        renderCalendar(service); // Render with fallback data
      });
  } else if (calendarInitialized) {
    // Just re-render with existing data
    renderCalendar(service);
  }
};

/**
 * Request OAuth authorization
 */
function requestAuthorization() {
  if (tokenClient) {
    // Request an access token
    tokenClient.requestAccessToken();
  } else {
    showError("Authentication service not initialized. Please refresh the page and try again.");
  }
}

/**
 * Create HTML for the calendar
 */
function createCalendarHTML(month, year, service) {
  const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];
  
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  let html = `
    <div class="calendar-header">
      <h3 class="text-center w-100">${monthNames[month]} ${year}</h3>
      <div class="calendar-navigation">
        <button class="btn btn-sm btn-outline-primary" onclick="prevMonth()"><i class="fas fa-chevron-left"></i></button>
        <button class="btn btn-sm btn-outline-primary" onclick="nextMonth()"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>
    <div class="calendar-grid">
      <div class="calendar-days-header">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>
      <div class="calendar-days">
  `;
  
  // Add empty cells for days before the first of the month
  for (let i = 0; i < startingDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isPast = date < today && !isToday;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday
    
    // Determine if this day should be available
    const isAvailable = !isPast && !isWeekend;
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isAvailable ? 'available' : ''}" 
           data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}"
           ${isAvailable ? `onclick="showTimeSlots(this)"` : ''}>
        <div class="day-number">${day}</div>
        ${isAvailable ? '<div class="availability">Available</div>' : ''}
      </div>
    `;
  }
  
  html += `
      </div>
    </div>
    <div class="time-slots-container" id="time-slots-container"></div>
    <div class="booking-form-container" id="booking-form-container" style="display:none;"></div>
  `;
  
  // Add custom styles for the calendar
  html += getCalendarStyles();
  
  return html;
}

/**
 * Get CSS styles for the calendar
 */
function getCalendarStyles() {
  return `
    <style>
      .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
        position: relative;
      }
      
      .calendar-header h3 {
        margin: 0;
        text-align: center;
        width: 100%;
        position: absolute;
        left: 0;
        right: 0;
      }
      
      .calendar-navigation {
        display: flex;
        gap: 10px;
        position: relative;
        z-index: 1;
        margin-left: auto;
      }
      
      .calendar-grid {
        margin-bottom: 30px;
      }
      
      .calendar-days-header {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-weight: bold;
        margin-bottom: 10px;
        background-color: #0576ee;
        color: white;
        padding: 10px 0;
        border-radius: 8px;
      }
      
      .calendar-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 5px;
      }
      
      .calendar-day {
        aspect-ratio: 1/1;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
        background-color: white;
      }
      
      .calendar-day.empty {
        background-color: transparent;
        border: none;
      }
      
      .calendar-day.today {
        border-color: #0576ee;
        background-color: rgba(5, 118, 238, 0.05);
      }
      
      .calendar-day.past {
        background-color: #f8f9fa;
        color: #aaa;
        cursor: not-allowed;
      }
      
      .calendar-day.available {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .calendar-day.available:hover {
        transform: scale(1.05);
        border-color: #0576ee;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      }
      
      .calendar-day.selected {
        background-color: #0576ee;
        color: white;
        border-color: #0576ee;
      }
      
      .day-number {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .availability {
        font-size: 12px;
        color: #4caf50;
      }
      
      .time-slots-container {
        margin-top: 30px;
      }
      
      .time-slots-container h4 {
        text-align: center;
        margin-bottom: 20px;
      }
      
      .time-slots-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 10px;
        margin-top: 20px;
        margin-bottom: 30px;
      }
      
      .time-slot {
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .time-slot:hover {
        border-color: #0576ee;
        background-color: rgba(5, 118, 238, 0.05);
      }
      
      .time-slot.selected {
        background-color: #0576ee;
        color: white;
        border-color: #0576ee;
      }
      
      .booking-form-container {
        margin-top: 30px;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 8px;
      }
      
      .booking-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      
      @media (max-width: 768px) {
        .booking-form {
          grid-template-columns: 1fr;
        }
        
        .calendar-days-header {
          font-size: 12px;
        }
        
        .day-number {
          font-size: 14px;
        }
      }
    </style>
  `;
}

/**
 * Get the name of a service
 */
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

/**
 * Show an error message
 */
function showError(message) {
  const calendarContainer = document.getElementById('appointment-calendar');
  
  if (calendarContainer) {
    // Show error but don't block the entire calendar
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-warning mb-4';
    errorDiv.role = 'alert';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> ${message}`;
    
    // Insert at the top of the calendar container
    if (calendarContainer.firstChild) {
      calendarContainer.insertBefore(errorDiv, calendarContainer.firstChild);
    } else {
      calendarContainer.appendChild(errorDiv);
    }
  }
}

// Add the time slot selection function to the window object
window.selectTimeSlot = function(timeSlot, dateString, timeString) {
  // Clear any previously selected time slots
  document.querySelectorAll('.time-slot.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Mark this time slot as selected
  timeSlot.classList.add('selected');
  
  // Store the selected date and time
  selectedDateTime = {
    date: dateString,
    time: timeString,
    service: window.selectedService
  };
  
  // Show the booking form
  showBookingForm(dateString, timeString);
};

/**
 * Show the booking form
 */
function showBookingForm(dateString, timeString) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) return;
  
  bookingFormContainer.style.display = 'block';
  
  bookingFormContainer.innerHTML = `
    <h4 class="mb-4">Complete Your Booking</h4>
    <p><strong>Service:</strong> ${getServiceName(window.selectedService)}</p>
    <p><strong>Date:</strong> ${formatDate(dateString)}</p>
    <p><strong>Time:</strong> ${formatTime(timeString)}</p>
    <p><strong>Duration:</strong> ${SERVICE_DURATION[window.selectedService]} minutes</p>
    
    <form class="booking-form mt-4" onsubmit="event.preventDefault(); submitBookingForm();">
      <div class="form-group">
        <label for="booking-first-name">First Name *</label>
        <input type="text" class="form-control" id="booking-first-name" required>
      </div>
      
      <div class="form-group">
        <label for="booking-last-name">Last Name *</label>
        <input type="text" class="form-control" id="booking-last-name" required>
      </div>
      
      <div class="form-group">
        <label for="booking-email">Email *</label>
        <input type="email" class="form-control" id="booking-email" required>
      </div>
      
      <div class="form-group">
        <label for="booking-phone">Phone Number *</label>
        <input type="tel" class="form-control" id="booking-phone" required>
      </div>
      
      <div class="form-group" style="grid-column: span 2;">
        <label for="booking-notes">Additional Notes</label>
        <textarea class="form-control" id="booking-notes" rows="3"></textarea>
      </div>
      
      <div class="form-group" style="grid-column: span 2;">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="booking-consent" required>
          <label class="form-check-label" for="booking-consent">
            I confirm that I want to receive content from DK Dental Studio using any contact information I provide.
          </label>
        </div>
      </div>
      
      <div style="grid-column: span 2; text-align: center; margin-top: 20px;">
        <button type="button" class="btn btn-outline-secondary mr-2" onclick="resetBookingForm()">Cancel</button>
        <button type="submit" class="btn btn-primary">Confirm Booking</button>
      </div>
    </form>
  `;
  
  // Scroll to the form
  bookingFormContainer.scrollIntoView({ behavior: 'smooth' });
}

// Add the reset booking form function to the window object
window.resetBookingForm = function() {
  // Reset the booking process
  selectedDateTime = null;
  
  // Clear selected day and time slot
  document.querySelectorAll('.calendar-day.selected, .time-slot.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Clear time slots and booking form
  const timeSlotsContainer = document.getElementById('time-slots-container');
  if (timeSlotsContainer) {
    timeSlotsContainer.innerHTML = '';
  }
  
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (bookingFormContainer) {
    bookingFormContainer.style.display = 'none';
  }
  
  // Scroll back to the calendar
  const calendarContainer = document.getElementById('appointment-calendar');
  if (calendarContainer) {
    calendarContainer.scrollIntoView({ behavior: 'smooth' });
  }
};

// Add the submit booking form function to the window object
window.submitBookingForm = function() {
  // Get form values
  const firstName = document.getElementById('booking-first-name').value;
  const lastName = document.getElementById('booking-last-name').value;
  const email = document.getElementById('booking-email').value;
  const phone = document.getElementById('booking-phone').value;
  const notes = document.getElementById('booking-notes').value;
  
  // Validate form
  if (!firstName || !lastName || !email || !phone) {
    alert('Please fill in all required fields.');
    return;
  }
  
  // Get the booking form container
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) return;
  
  // Show processing message
  bookingFormContainer.innerHTML = `
    <div class="text-center">
      <div class="spinner" style="margin: 20px auto;"></div>
      <h4 class="mt-3">Processing Your Booking</h4>
      <p>Please wait while we confirm your appointment...</p>
    </div>
  `;
  
  // Create booking data
  const bookingData = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: phone,
    notes: notes,
    service: window.selectedService,
    date: selectedDateTime.date,
    time: selectedDateTime.time,
    isFullyLoaded: availabilityLoaded // Add the calendar status
  };
  
  // Create Google Calendar event if calendar is fully loaded
  if (availabilityLoaded) {
    debugLog('Creating Google Calendar event');
    
    // Format date and time for Google Calendar
    const startDateTime = new Date(`${selectedDateTime.date}T${selectedDateTime.time}`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + SERVICE_DURATION[window.selectedService]);
    
    // Format the dates in ISO format
    const startDateTimeIso = startDateTime.toISOString();
    const endDateTimeIso = endDateTime.toISOString();
    
    // Create event object
    const eventData = {
      'summary': `${getServiceName(window.selectedService)} - ${firstName} ${lastName}`,
      'description': `
        Appointment Details:
        Service: ${getServiceName(window.selectedService)}
        Name: ${firstName} ${lastName}
        Email: ${email}
        Phone: ${phone}
        Notes: ${notes}
      `,
      'start': {
        'dateTime': startDateTimeIso
      },
      'end': {
        'dateTime': endDateTimeIso
      },
      'reminders': {
        'useDefault': false,
        'overrides': [
          {'method': 'popup', 'minutes': 60} // 1 hour before
        ]
      }
    };
    
    // Send the event data to the server to create the calendar event
    fetch('/script/calendar/create-event.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: eventData,
        service: window.selectedService
      })
    })
    .then(response => response.json())
    .then(eventResult => {
      debugLog('Calendar event creation result:', eventResult);
      
      if (!eventResult.success) {
        debugLog('Warning: Calendar event creation failed:', eventResult.error);
        console.warn('Calendar event creation failed:', eventResult.error);
      }
      
      // Proceed with email confirmation regardless of calendar event success
      sendBookingConfirmation(bookingData);
    })
    .catch(error => {
      debugLog('Error creating calendar event:', error);
      console.error('Error creating calendar event:', error);
      
      // Proceed with email confirmation even if calendar event fails
      sendBookingConfirmation(bookingData);
    });
  } else {
    // If in basic mode, just send the email confirmation
    sendBookingConfirmation(bookingData);
  }
};

/**
 * Send booking confirmation email
 */
function sendBookingConfirmation(bookingData) {
  // Send the booking data to the server for email confirmation
  fetch('/script/calendar/booking-fallback.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showBookingSuccess(bookingData.firstName, bookingData.lastName, bookingData.email);
    } else {
      showBookingError();
    }
  })
  .catch(error => {
    console.error('Error submitting booking:', error);
    showBookingError();
  });
}

/**
 * Show booking success message
 */
function showBookingSuccess(firstName, lastName, email) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) return;
  
  // Store appointment for reminder email
  if (selectedDateTime && selectedDateTime.date && selectedDateTime.time) {
    storeAppointmentForReminder(
      firstName, 
      lastName, 
      email, 
      selectedDateTime.date, 
      selectedDateTime.time, 
      window.selectedService
    );
  }
  
  bookingFormContainer.innerHTML = `
    <div class="booking-success">
      <div class="text-center mb-4">
        <i class="fas fa-check-circle text-success" style="font-size: 48px;"></i>
      </div>
      <h4 class="text-center">Booking Request Submitted!</h4>
      <p class="text-center">We've received your appointment request for ${getServiceName(window.selectedService)} on ${formatDate(selectedDateTime.date)} at ${formatTime(selectedDateTime.time)}.</p>
      <p class="text-center">Our staff will contact you shortly to confirm your appointment.</p>
      <div class="alert alert-info mt-3">
        <p class="mb-0"><strong>What happens next:</strong></p>
        <ul class="mb-0 text-left">
          <li>Our team will review your booking</li>
          <li>You'll receive a confirmation email</li>
          <li>You'll receive a reminder email 24 hours before your appointment</li>
          <li>If you need to change your appointment, please call us at (02) 9398 7578</li>
        </ul>
      </div>
      <div class="text-center mt-4">
        <button class="btn btn-primary" onclick="resetBookingForm()">Book Another Appointment</button>
      </div>
    </div>
  `;
  
  // Refresh the calendar after booking
  setTimeout(() => {
    reloadCalendarAfterBooking();
  }, 3000);
}

/**
 * Store appointment for reminder email
 */
function storeAppointmentForReminder(firstName, lastName, email, date, time, service) {
  // Format the date and time for the API
  const appointmentDateTime = new Date(`${date}T${time}`);
  const isoDateTime = appointmentDateTime.toISOString();
  
  // Get the service name
  const serviceName = getServiceName(service);
  
  // Create the data to send
  const reminderData = {
    datetime: isoDateTime,
    email: email,
    firstName: firstName,
    service: serviceName
  };
  
  // Send the data to the server
  fetch('/script/email/save_reminder.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reminderData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      debugLog('Reminder scheduled successfully');
    } else {
      debugLog('Failed to schedule reminder:', data.error);
    }
  })
  .catch(error => {
    debugLog('Error scheduling reminder:', error);
  });
}

/**
 * Reload the calendar after booking
 */
function reloadCalendarAfterBooking() {
  if (window.selectedService) {
    // Clear any selected day
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Clear time slots
    const timeSlotsContainer = document.getElementById('time-slots-container');
    if (timeSlotsContainer) {
      timeSlotsContainer.innerHTML = '';
    }
    
    // Reload the calendar for the current service
    loadCalendarForService(window.selectedService);
  }
}

/**
 * Show booking error message
 */
function showBookingError() {
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) return;
  
  bookingFormContainer.innerHTML = `
    <div class="booking-error">
      <div class="text-center mb-4">
        <i class="fas fa-exclamation-circle text-danger" style="font-size: 48px;"></i>
      </div>
      <h4 class="text-center">Booking Error</h4>
      <p class="text-center">We encountered an issue while processing your booking. Please try again or contact us directly at (02) 9398 7578.</p>
      <div class="text-center mt-4">
        <button class="btn btn-primary" onclick="resetBookingForm()">Try Again</button>
      </div>
    </div>
  `;
}

/**
 * Load all availability data for the next 6 weeks
 */
function loadAllAvailabilityData() {
  debugLog('Loading all availability data');
  
  // Prevent multiple simultaneous loading
  if (isLoadingAvailability) {
    debugLog('Already loading availability data, returning existing promise');
    if (availabilityLoadingPromise) {
      return availabilityLoadingPromise;
    }
    // If we don't have a promise but the flag is set, something went wrong
    // Reset the flag and try again
    isLoadingAvailability = false;
  }
  
  isLoadingAvailability = true;
  
  // Create the promise
  availabilityLoadingPromise = new Promise((resolve, reject) => {
    // Get dates for the next 6 weeks
    const today = new Date();
    const sixWeeksLater = new Date();
    sixWeeksLater.setDate(today.getDate() + 42); // 6 weeks = 42 days
    
    debugLog('Loading availability from', today.toISOString(), 'to', sixWeeksLater.toISOString());
    
    // Set a longer timeout for the loading process (30 seconds)
    const timeoutId = setTimeout(() => {
      debugLog('Availability loading timed out after 30 seconds');
      
      // Create fallback data
      createFallbackAvailabilityData();
      
      // Mark as loaded, but with fallback data
      isLoadingAvailability = false;
      availabilityLoaded = false;
      availabilityLoadingPromise = null;
      
      // Resolve with the fallback data to continue
      resolve(availabilityData);
    }, 30000);
    
    // Load availability data for the next 6 weeks
    loadAvailabilityPeriod(today, sixWeeksLater)
      .then((data) => {
        // Clear the timeout
        clearTimeout(timeoutId);
        
        // Store the data in both current and next month objects
        availabilityData.currentMonth = data;
        availabilityData.nextMonth = data;
        availabilityLoaded = true;
        isLoadingAvailability = false;
        availabilityLoadingPromise = null;
        debugLog('All availability data loaded successfully');
        
        // Debug the loaded data
        debugAvailabilityData();
        
        resolve(data);
      })
      .catch(err => {
        // Clear the timeout
        clearTimeout(timeoutId);
        
        isLoadingAvailability = false;
        availabilityLoadingPromise = null;
        debugLog('Error loading availability data:', err);
        
        // Create fallback data
        createFallbackAvailabilityData();
        
        // Still resolve (with fallback data) rather than reject
        // to prevent calendar from breaking completely
        resolve(availabilityData);
      });
  });
  
  return availabilityLoadingPromise;
}

/**
 * Load availability data for a specific period
 */
function loadAvailabilityPeriod(startDate, endDate) {
  return new Promise((resolve, reject) => {
    // Format dates for the API
    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();
    
    debugLog('Fetching calendar events from', timeMin, 'to', timeMax);
    
    // Make sure we have a valid token before proceeding
    if (!gapi.client.getToken()) {
      debugLog('No token available for calendar API call, getting a new one');
      
      fetchServerAccessToken()
        .then(token => {
          debugLog('Token refreshed for calendar API call');
          serverAccessToken = token;
          window.serverAccessToken = token;
          
          // Set the token for API calls
          gapi.client.setToken({ access_token: token });
          
          // Now make the calendar API call
          return getCalendarEvents(timeMin, timeMax);
        })
        .then(response => processCalendarData(response, startDate, endDate, resolve))
        .catch(err => {
          debugLog('Error with token refresh or calendar API call:', err);
          reject(err);
        });
    } else {
      // We have a token, proceed with the API call
      getCalendarEvents(timeMin, timeMax)
        .then(response => processCalendarData(response, startDate, endDate, resolve))
        .catch(err => {
          debugLog('Error fetching events:', err);
          
          // Try refreshing the token once
          debugLog('Attempting to refresh token and retry');
          
          fetchServerAccessToken()
            .then(token => {
              debugLog('Token refreshed, retrying calendar API call');
              serverAccessToken = token;
              window.serverAccessToken = token;
              
              // Set the token for API calls
              gapi.client.setToken({ access_token: token });
              
              // Retry the calendar API call
              return getCalendarEvents(timeMin, timeMax);
            })
            .then(response => processCalendarData(response, startDate, endDate, resolve))
            .catch(retryErr => {
              debugLog('Retry failed:', retryErr);
              
              // Create fallback data for the period
              const fallbackData = createFallbackPeriodData(startDate, endDate);
              
              resolve(fallbackData);
            });
        });
    }
  });
}

/**
 * Make the actual API call to get calendar events
 */
function getCalendarEvents(timeMin, timeMax) {
  return gapi.client.calendar.events.list({
    calendarId: CALENDAR_ID[window.selectedService],
    timeMin: timeMin,
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime'
  });
}

/**
 * Process calendar data from API response
 */
function processCalendarData(response, startDate, endDate, resolve) {
  debugLog('Received events:', response.result.items ? response.result.items.length : 0);
  
  // Process all events into busy periods
  const busyPeriods = {};
  
  if (response.result && response.result.items && response.result.items.length > 0) {
    response.result.items.forEach(event => {
      // Skip certain types of events
      if (event.eventType === 'workingLocation' || 
          event.transparency === 'transparent' ||
          (event.start.date && !event.start.dateTime)) {
        debugLog('Skipping non-blocking event:', event.summary);
        return;
      }
      
      // Skip events with zero duration
      if (event.start && event.end && event.start.dateTime === event.end.dateTime) {
        debugLog('Skipping zero-duration event:', event.summary);
        return;
      }
      
      // Only process events with dateTime (not all-day events)
      if (event.start.dateTime && event.end.dateTime) {
        const startDate = new Date(event.start.dateTime);
        const endDate = new Date(event.end.dateTime);
        
        // Get the day key (YYYY-MM-DD)
        const dayKey = startDate.toISOString().split('T')[0];
        
        // Initialize the busy periods array for this day if needed
        if (!busyPeriods[dayKey]) {
          busyPeriods[dayKey] = [];
        }
        
        // Add the busy period
        busyPeriods[dayKey].push({
          summary: event.summary,
          start: startDate,
          end: endDate
        });
        
        debugLog('Added busy period for', dayKey, ':', event.summary);
      }
    });
  }
  
  // Now generate all available slots for each weekday in the period
  const periodData = {};
  let availableDaysCount = 0;
  let fullyBookedDaysCount = 0;
  
  // Get the range of days to process
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Loop through each day in the period
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const dateObj = new Date(day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }
    
    // Create the day key
    const dayKey = dateObj.toISOString().split('T')[0];
    
    // Get all possible time slots for this day
    const allSlots = getAllPossibleTimeSlots(dateObj);
    
    // Filter available slots based on busy periods
    const availableSlots = filterAvailableSlots(allSlots, dateObj, busyPeriods[dayKey] || []);
    
    // Store the available slots for this day
    periodData[dayKey] = availableSlots;
    
    // Track availability statistics
    if (availableSlots.length > 0) {
      availableDaysCount++;
      debugLog(`Date ${dayKey} has ${availableSlots.length} available slots out of ${allSlots.length} total`);
    } else {
      fullyBookedDaysCount++;
      // For days marked as fully booked, double-check if they actually have busy periods
      if (!busyPeriods[dayKey] || busyPeriods[dayKey].length === 0) {
        debugLog(`WARNING: Date ${dayKey} has no busy periods but is marked as fully booked`);
        // This is a safety measure - provide default slots if incorrectly marked as booked
        periodData[dayKey] = allSlots;
        // Correct the counts
        availableDaysCount++;
        fullyBookedDaysCount--;
      }
    }
  }
  
  debugLog(`Processed calendar data: ${availableDaysCount} days with availability, ${fullyBookedDaysCount} fully booked days`);
  
  resolve(periodData);
}

/**
 * Create fallback data for a specific period
 */
function createFallbackPeriodData(startDate, endDate) {
  const periodData = {};
  
  // Loop through each day in the period
  for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
    const dateObj = new Date(day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }
    
    // Create the day key
    const dayKey = dateObj.toISOString().split('T')[0];
    
    // Get all possible time slots for this day
    const allSlots = getAllPossibleTimeSlots(dateObj);
    
    // In fallback mode, all slots are available for weekdays
    periodData[dayKey] = allSlots;
  }
  
  return periodData;
}

/**
 * Get all possible time slots for a day
 */
function getAllPossibleTimeSlots(date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Define business hours based on service and day of week
  let startHour, endHour;
  
  // Check for weekends first
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // No appointments on weekends
    return [];
  }
  
  // Standard business hours - consistent for all services and days
  // This simplification ensures more consistent behavior
  startHour = 10; // 10 AM
  endHour = 16;   // 4 PM
  
  // Generate all possible slots every hour (60 minutes)
  const allSlots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    allSlots.push(`${String(hour).padStart(2, '0')}:00`);
  }
  
  // Debug generated slots
  if (allSlots.length === 0) {
    debugLog(`WARNING: Generated 0 slots for ${date.toISOString().split('T')[0]}, day of week: ${dayOfWeek}`);
  }
  
  return allSlots;
}

/**
 * Filter available slots based on busy periods
 */
function filterAvailableSlots(allSlots, date, busyPeriods) {
  if (!busyPeriods || !busyPeriods.length) {
    return allSlots; // No busy periods, all slots available
  }
  
  const dateStr = date.toISOString().split('T')[0];
  debugLog(`Filtering slots for ${dateStr}, found ${busyPeriods.length} busy periods`);
  
  const busySlots = [];
  
  // Check each slot against busy periods
  allSlots.forEach(slot => {
    const [hours, minutes] = slot.split(':').map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(hours, minutes, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + SERVICE_DURATION[window.selectedService]);
    
    // Check if this slot overlaps with any busy period
    let isSlotBusy = false;
    for (const period of busyPeriods) {
      // Ensure period times are Date objects
      const periodStart = period.start instanceof Date ? period.start : new Date(period.start);
      const periodEnd = period.end instanceof Date ? period.end : new Date(period.end);
      
      // Handle case where start and end dates are on different days
      if (periodStart.toISOString().split('T')[0] !== dateStr && 
          periodEnd.toISOString().split('T')[0] !== dateStr) {
        // Event doesn't touch this day at all
        continue;
      }
      
      // Fix for events spanning multiple days - only consider the portion on this day
      let effectiveStart = periodStart;
      let effectiveEnd = periodEnd;
      
      // If event starts before this day, set start to beginning of this day
      if (periodStart.toISOString().split('T')[0] !== dateStr) {
        effectiveStart = new Date(date);
        effectiveStart.setHours(0, 0, 0, 0);
      }
      
      // If event ends after this day, set end to end of this day
      if (periodEnd.toISOString().split('T')[0] !== dateStr) {
        effectiveEnd = new Date(date);
        effectiveEnd.setHours(23, 59, 59, 999);
      }
      
      const isOverlap = (
        (slotStart >= effectiveStart && slotStart < effectiveEnd) || 
        (slotEnd > effectiveStart && slotEnd <= effectiveEnd) || 
        (slotStart <= effectiveStart && slotEnd >= effectiveEnd)
      );
      
      if (isOverlap) {
        isSlotBusy = true;
        debugLog(`Slot ${slot} conflicts with event: ${period.summary}`);
        break;
      }
    }
    
    if (isSlotBusy) {
      busySlots.push(slot);
    }
  });
  
  // Filter out busy slots to get available slots
  const availableSlots = allSlots.filter(slot => !busySlots.includes(slot));
  debugLog(`Date ${dateStr} has ${availableSlots.length} available slots out of ${allSlots.length} total`);
  
  return availableSlots;
}

/**
 * Create default busy periods for a day based on day of week
 * In the new version, all slots are available in fallback mode
 */
function createDefaultBusyPeriodsForDay(allSlots, dayOfWeek) {
  // Return all slots as available in fallback mode
  return allSlots;
}

/**
 * Helper class for hour representation
 */
function Hour(hours, minutes) {
  this.hours = hours;
  this.minutes = minutes || 0;
}

// Add a new helper function to debug availability data after loading
function debugAvailabilityData() {
  if (!availabilityLoaded) {
    debugLog('Cannot debug availability data - not loaded yet');
    return;
  }
  
  // Count days with data
  const combinedData = {
    ...availabilityData.currentMonth,
    ...availabilityData.nextMonth
  };
  
  const daysWithData = Object.keys(combinedData).length;
  const daysWithNoSlots = Object.keys(combinedData).filter(key => 
    !combinedData[key] || combinedData[key].length === 0
  ).length;
  
  debugLog(`Availability overview: ${daysWithData} days loaded, ${daysWithNoSlots} fully booked days`);
  
  // List any days with zero slots
  if (daysWithNoSlots > 0) {
    debugLog('Days with zero slots:');
    Object.keys(combinedData).forEach(date => {
      if (!combinedData[date] || combinedData[date].length === 0) {
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        debugLog(`- ${date} (${dayOfWeek}) has 0 available slots`);
      }
    });
  }
} 