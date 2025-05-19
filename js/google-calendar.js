/**
 * Google Calendar Integration for DK Dental Studio Appointment Booking
 */

// Debug mode - set to true to show detailed debug information
const DEBUG_MODE = false;

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
  
  // Initialize once
  if (!isInitialized) {
    isInitialized = true;
    initializeCalendar();
  }
});

/**
 * Initialize the calendar system
 */
function initializeCalendar() {
  debugLog('Initializing calendar system');
  
  // Get gapi from window
  gapi = window.gapi;
  if (!gapi) {
    debugLog('Google API client not available');
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
          
          // Load the calendar with the current selected service
          calendarInitialized = true;
          loadCalendar(window.selectedService);
        })
        .catch(err => {
          debugLog('Token fetch failed:', err);
          showBasicCalendar();
        });
    })
    .catch(err => {
      debugLog('API client initialization failed:', err);
      showBasicCalendar();
    });
  });
}

/**
 * Fetch access token from server
 */
function fetchServerAccessToken() {
  return new Promise((resolve, reject) => {
    debugLog('Fetching server access token...');
    
    // Use absolute path for production environment with proper protocol
    const apiUrl = '/script/calendar/get-access-token.php';
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
        if (!response.ok) {
          throw new Error(`Failed to fetch token: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success && data.access_token) {
          return data.access_token;
        } else {
          throw new Error(data.error || 'No access token in response');
        }
      })
      .then(resolve)
      .catch(reject);
  });
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
  
  // Get today's date for initial view
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  
  // Create and render the calendar
  calendarContainer.innerHTML = createCalendarHTML(month, year, service);
  
  // Setup calendar interactions
  setupCalendarInteraction();
  
  // Show success message
  const notice = document.createElement('div');
  notice.className = 'alert alert-success mb-4';
  notice.innerHTML = `<p><strong>Calendar loaded successfully.</strong> Please select a date to see available times.</p>`;
  
  if (calendarContainer.firstChild) {
    calendarContainer.insertBefore(notice, calendarContainer.firstChild);
  } else {
    calendarContainer.appendChild(notice);
  }
  
  // Update UI to match selected service
  updateServiceSelectionUI(service);
}

/**
 * Show basic calendar without API integration
 */
function showBasicCalendar() {
  debugLog('Showing basic calendar');
  
  // Get the service to use for the calendar
  const service = window.selectedService || 'dentures';
  
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
  
  // Create notice for basic mode
  const notice = document.createElement('div');
  notice.className = 'alert alert-info mb-4';
  notice.innerHTML = `<p><strong>Note:</strong> The calendar is in basic mode. Your booking will be sent to our staff for confirmation.</p>`;
  
  // Create and render the calendar
  calendarContainer.innerHTML = createCalendarHTML(month, year, service);
  
  // Add the notice
  calendarContainer.insertBefore(notice, calendarContainer.firstChild);
  
  // Setup calendar interactions
  setupCalendarInteraction();
  
  // Update UI to match selected service
  updateServiceSelectionUI(service);
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
  
  // If calendar is already initialized, just load for the new service
  if (calendarInitialized && serverAccessToken) {
    loadCalendar(service);
  } else {
    // Try to initialize
    initializeCalendar();
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
    const successMessage = calendarContainer.querySelector('.alert-success');
    
    // Re-render the calendar
    calendarContainer.innerHTML = createCalendarHTML(month, newYear, window.selectedService);
    
    // Re-add the success message if it existed
    if (successMessage) {
      calendarContainer.insertBefore(successMessage, calendarContainer.firstChild);
    }
    
    // Re-setup the interactions
    setupCalendarInteraction();
    
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
    const successMessage = calendarContainer.querySelector('.alert-success');
    
    // Re-render the calendar
    calendarContainer.innerHTML = createCalendarHTML(month, newYear, window.selectedService);
    
    // Re-add the success message if it existed
    if (successMessage) {
      calendarContainer.insertBefore(successMessage, calendarContainer.firstChild);
    }
    
    // Re-setup the interactions
    setupCalendarInteraction();
    
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
    
    // Generate the time slots for this date
    generateTimeSlots(dateString)
      .then(timeSlots => {
        // Show the time slots
        timeSlotsContainer.innerHTML = createTimeSlotsHTML(dateString, timeSlots);
        
        // Scroll to the time slots
        timeSlotsContainer.scrollIntoView({ behavior: 'smooth' });
      })
      .catch(error => {
        debugLog('Error generating time slots:', error);
        
        // Show error message
        timeSlotsContainer.innerHTML = `
          <div class="alert alert-warning">
            <p>We encountered an issue loading available times. Please try again or select another date.</p>
            <div class="text-center mt-3">
              <button class="btn btn-primary" onclick="showTimeSlots(document.querySelector('.calendar-day.selected'))">Retry</button>
            </div>
          </div>
        `;
      });
    
    // Clear any booking form
    const bookingFormContainer = document.getElementById('booking-form-container');
    if (bookingFormContainer) {
      bookingFormContainer.style.display = 'none';
    }
  };
}

/**
 * Generate time slots for a given date
 */
function generateTimeSlots(dateString) {
  debugLog('Generating time slots for date:', dateString);
  
  // Define business hours based on service and day of week
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Define business hours
  let startHour, endHour;
  
  // Check for weekends first
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // No appointments on weekends
    return Promise.resolve([]);
  }
  
  if (window.selectedService === 'mouthguards' && (dayOfWeek >= 1 && dayOfWeek <= 3)) {
    // Mon-Wed for mouthguards: 10am-6pm
    startHour = 10;
    endHour = 18;
  } else {
    // Other days or services: 10am-4pm
    // This covers:
    // - Dentures (Mon-Fri): 10am-4pm
    // - Repairs (Mon-Fri): 10am-4pm (same as dentures)
    // - Mouthguards (Thu-Fri): 10am-4pm
    startHour = 10;
    endHour = 16;
  }
  
  // Generate all possible slots every hour (60 minutes)
  const allSlots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    allSlots.push(`${String(hour).padStart(2, '0')}:00`);
  }
  
  debugLog('Generated all possible time slots:', allSlots);
  
  // Get available time slots from the calendar
  return getAvailableSlots(allSlots, date, dateString);
}

/**
 * Get available time slots from the calendar for a given date
 */
function getAvailableSlots(allSlots, date, dateString) {
  // If Google Calendar API is not available, show all slots
  if (!gapi || !gapi.client || !gapi.client.calendar || !serverAccessToken) {
    debugLog('Google Calendar API not available, showing all slots');
    return Promise.resolve(allSlots);
  }
  
  debugLog('Checking calendar availability for date:', dateString);
  
  // Create time range for the entire day
  const timeMin = new Date(dateString + 'T00:00:00').toISOString();
  const timeMax = new Date(dateString + 'T23:59:59').toISOString();
  
  // Return a promise that resolves with available slots
  return new Promise((resolve, reject) => {
    // Reset the token to prevent caching issues
    if (window.serverAccessToken) {
      gapi.client.setToken({ access_token: window.serverAccessToken });
      debugLog('Reset access token');
    }
    
    // Get events for the specified date
    gapi.client.calendar.events.list({
      calendarId: CALENDAR_ID[window.selectedService],
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    }).then(response => {
      debugLog('Calendar events response:', response);
      
      // Extract busy periods from events
      const busyPeriods = [];
      
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
          
          // Add this event as a busy period
          if (event.start.dateTime && event.end.dateTime) {
            busyPeriods.push({
              summary: event.summary,
              start: new Date(event.start.dateTime),
              end: new Date(event.end.dateTime)
            });
            debugLog('Added busy period:', event.summary);
          }
        });
      }
      
      // Check each slot against busy periods to determine availability
      const busySlots = [];
      allSlots.forEach(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotStart = new Date(date);
        slotStart.setHours(hours, minutes, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + SERVICE_DURATION[window.selectedService]);
        
        // Check if this slot overlaps with any busy period
        for (const period of busyPeriods) {
          const isOverlap = (
            (slotStart >= period.start && slotStart < period.end) || 
            (slotEnd > period.start && slotEnd <= period.end) || 
            (slotStart <= period.start && slotEnd >= period.end)
          );
          
          if (isOverlap) {
            debugLog(`Slot ${slot} is busy due to event: ${period.summary}`);
            busySlots.push(slot);
            break;
          }
        }
      });
      
      // Filter out busy slots to get available slots
      const availableSlots = allSlots.filter(slot => !busySlots.includes(slot));
      debugLog('Final available slots:', availableSlots);
      
      resolve(availableSlots);
    }).catch(error => {
      debugLog('Error fetching calendar data:', error);
      resolve(allSlots); // Show all slots if there's an error
    });
  });
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
    <div class="time-slots-grid">
  `;
  
  timeSlots.forEach(slot => {
    html += `
      <div class="time-slot" onclick="selectTimeSlot(this, '${dateString}', '${slot}')">
        ${formatTime(slot)}
      </div>
    `;
  });
  
  html += `</div>`;
  return html;
}

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
    content.style.display = 'none';
    
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
    time: selectedDateTime.time
  };
  
  // Send the booking data to the server
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
      showBookingSuccess(firstName, lastName, email);
    } else {
      showBookingError();
    }
  })
  .catch(error => {
    console.error('Error submitting booking:', error);
    showBookingError();
  });
};

/**
 * Show booking success message
 */
function showBookingSuccess(firstName, lastName, email) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (!bookingFormContainer) return;
  
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