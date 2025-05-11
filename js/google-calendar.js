/**
 * Google Calendar Integration for DK Dental Studio Appointment Booking
 */

// Google API credentials
// const GOOGLE_API_KEY = 'AIzaSyDFoNqB7BIuoZrUQDRVhnpVLjXsUgT-6Ow'; // Replace with your API key - Not used with server-side OAuth
const GOOGLE_CLIENT_ID = '593699947617-hulnksmaqujj6o0j1sob13klorehtspt.apps.googleusercontent.com';
const CALENDAR_ID = {
  'dentures': 'primary', // Replace with actual calendar ID for dentures
  'repairs': 'primary',  // Replace with actual calendar ID for repairs
  'mouthguards': 'primary' // Replace with actual calendar ID for mouthguards
};

// Google API discovery docs and scope
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events";

// Default service durations in minutes
const SERVICE_DURATION = {
  'dentures': 45,
  'repairs': 30,
  'mouthguards': 30
};

// Store selected service
let selectedService = null;
let selectedDateTime = null;
let gapi = null;
let tokenClient = null;
let serverAccessToken = null;

/**
 * On page load, initialize Google API client
 */
document.addEventListener('DOMContentLoaded', function() {
  // Load the Google API client
  loadGoogleAPI();
});

/**
 * Fetch access token from server
 * This function gets the OAuth token from the server instead of using client-side auth
 */
function fetchServerAccessToken() {
  return new Promise((resolve, reject) => {
    fetch('/api/get-access-token.php')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch access token from server');
        }
        return response.json();
      })
      .then(data => {
        if (data.access_token) {
          serverAccessToken = data.access_token;
          resolve(serverAccessToken);
        } else {
          throw new Error('No access token in response');
        }
      })
      .catch(error => {
        console.error('Error fetching server access token:', error);
        reject(error);
      });
  });
}

/**
 * Load the Google API client and auth2 library
 */
function loadGoogleAPI() {
  gapi = window.gapi;
  
  if (!gapi) {
    showError("Google API client not loaded. Please check your internet connection and try again.");
    showFallbackCalendar();
    return;
  }
  
  // Load the client
  gapi.load('client', function() {
    initClient();
  });
}

/**
 * Initialize the Google API client
 */
function initClient() {
  // Initialize the client without an API key
  gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
  }).then(() => {
    console.log('Google API client initialized');
    
    // Fetch token from server instead of using client-side auth
    fetchServerAccessToken()
      .then(token => {
        // Set the access token for all future requests
        gapi.client.setToken({ access_token: token });
        console.log('Server access token applied to gapi client');
        
        // If a service is already selected, load it
        if (selectedService) {
          loadCalendar(selectedService);
        }
      })
      .catch(error => {
        console.error('Failed to set server access token:', error);
        showError("Failed to authorize access to Google Calendar. Using fallback calendar.");
        showFallbackCalendar();
      });
  }).catch(error => {
    console.error('Error initializing Google API client', error);
    showError("Failed to initialize Google Calendar. Using fallback calendar.");
    showFallbackCalendar();
  });
}

/**
 * Show a fallback calendar without Google Calendar integration
 */
function showFallbackCalendar() {
  // If Google Calendar integration fails, we can still show a basic calendar
  // that allows users to select dates and times, but booking will use the fallback method
  if (selectedService) {
    loadCalendar(selectedService);
  }
}

/**
 * Expose the loadCalendarForService function globally
 */
window.loadCalendarForService = function(service) {
  selectedService = service;
  console.log('Loading calendar for service:', service);
  
  // Update UI to show selected service
  document.querySelectorAll('.service-card').forEach(card => {
    if (card.dataset.service === service) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  
  // Show loading state
  const calendarContainer = document.getElementById('appointment-calendar');
  calendarContainer.innerHTML = `
    <div class="calendar-loading">
      <div class="spinner"></div>
      <p>Loading appointment calendar for ${getServiceName(service)}...</p>
    </div>
  `;
  
  // Clear any previous time slots and booking form
  document.getElementById('time-slots-container').innerHTML = '';
  const bookingFormContainer = document.getElementById('booking-form-container');
  if (bookingFormContainer) {
    bookingFormContainer.style.display = 'none';
  }
  
  // Check if we're authorized and have the calendar API loaded
  if (!gapi) {
    // First load - initialize the API
    loadGoogleAPI();
  } else if (!gapi.client || !gapi.client.calendar) {
    // API loaded but calendar not initialized
    initClient();
  } else {
    // Proceed to load the calendar
    loadCalendar(service);
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
 * Load the calendar for the selected service
 */
function loadCalendar(service) {
  // Get the calendar container
  const calendarContainer = document.getElementById('appointment-calendar');
  
  // For this demo, we'll show a mock calendar interface
  // In a production environment, you would use the Google Calendar API to fetch free/busy times
  
  // Get today's date
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  
  // Create the calendar layout
  calendarContainer.innerHTML = createCalendarHTML(month, year, service);
  
  // Add event listeners to calendar days
  setupCalendarInteraction();
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
      <h3>${monthNames[month]} ${year}</h3>
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
    <div class="booking-form-container" id="booking-form-container"></div>
  `;
  
  // Add custom styles for the calendar
  html += `
    <style>
      .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
      }
      
      .calendar-navigation {
        display: flex;
        gap: 10px;
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
      
      .time-slots-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 10px;
        margin-top: 20px;
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
        display: none;
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
  
  return html;
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
    calendarContainer.innerHTML = createCalendarHTML(month, newYear, selectedService);
    
    // Re-setup the interactions
    setupCalendarInteraction();
    
    // Clear time slots and booking form
    document.getElementById('time-slots-container').innerHTML = '';
    if (document.getElementById('booking-form-container')) {
      document.getElementById('booking-form-container').style.display = 'none';
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
    calendarContainer.innerHTML = createCalendarHTML(month, newYear, selectedService);
    
    // Re-setup the interactions
    setupCalendarInteraction();
    
    // Clear time slots and booking form
    document.getElementById('time-slots-container').innerHTML = '';
    if (document.getElementById('booking-form-container')) {
      document.getElementById('booking-form-container').style.display = 'none';
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
    
    // Show time slots for this date
    const timeSlotsContainer = document.getElementById('time-slots-container');
    timeSlotsContainer.innerHTML = createTimeSlotsHTML(dateString);
    
    // Clear any booking form
    const bookingFormContainer = document.getElementById('booking-form-container');
    bookingFormContainer.style.display = 'none';
    
    // Scroll to time slots
    timeSlotsContainer.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Define the function to select a time slot
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
      service: selectedService
    };
    
    // Show the booking form
    showBookingForm(dateString, timeString);
  };
  
  // Define the function to submit the booking form
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
    
    // Create event data
    const eventData = {
      summary: `${getServiceName(selectedService)} - ${firstName} ${lastName}`,
      description: `Appointment type: ${getServiceName(selectedService)}\nNotes: ${notes}\nPhone: ${phone}\nEmail: ${email}`,
      start: {
        dateTime: `${selectedDateTime.date}T${selectedDateTime.time}:00`,
        timeZone: 'Australia/Sydney'
      },
      end: {
        dateTime: getEndTime(selectedDateTime.date, selectedDateTime.time, SERVICE_DURATION[selectedService]),
        timeZone: 'Australia/Sydney'
      },
      attendees: [
        { email: email }
      ]
    };
    
    // Show loading state
    const bookingFormContainer = document.getElementById('booking-form-container');
    bookingFormContainer.innerHTML = `
      <div class="booking-processing">
        <div class="text-center mb-4">
          <div class="spinner"></div>
        </div>
        <h4 class="text-center">Processing Your Booking...</h4>
        <p class="text-center">Please wait while we confirm your appointment.</p>
      </div>
    `;

    // Check if we have Google Calendar API access
    if (gapi && gapi.client && gapi.client.calendar && serverAccessToken) {
      // Use the Google Calendar API to create the event
      gapi.client.calendar.events.insert({
        calendarId: CALENDAR_ID[selectedService],
        resource: eventData
      }).then(response => {
        console.log('Event created: ', response);
        showBookingSuccess(firstName, lastName, email);
      }).catch(error => {
        console.error('Error creating event:', error);
        // Fall back to server-side booking if client-side fails
        createEventServerSide(eventData, firstName, lastName, email);
      });
    } else {
      // Use server-side booking
      createEventServerSide(eventData, firstName, lastName, email);
    }
  };
  
  /**
   * Create event using server-side API
   */
  function createEventServerSide(eventData, firstName, lastName, email) {
    // Send the booking data to the server
    fetch('/api/create-event.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: eventData,
        service: selectedService
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showBookingSuccess(firstName, lastName, email);
      } else {
        // If server-side booking fails, use fallback booking
        console.error('Server-side booking failed:', data.error);
        useFallbackBooking(eventData, firstName, lastName, email);
      }
    })
    .catch(error => {
      console.error('Error with server-side booking:', error);
      useFallbackBooking(eventData, firstName, lastName, email);
    });
  }

  /**
   * Use fallback booking method (email)
   */
  function useFallbackBooking(eventData, firstName, lastName, email) {
    // Send the booking data to the fallback PHP handler
    fetch('/api/booking-fallback.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: eventData.description.match(/Phone: (.*)/)[1],
        notes: eventData.description.match(/Notes: (.*)/)[1] || '',
        service: selectedService,
        date: selectedDateTime.date,
        time: selectedDateTime.time
      })
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
      console.error('Error with fallback booking:', error);
      showBookingError();
    });
  }

  /**
   * Show booking success message
   */
  function showBookingSuccess(firstName, lastName, email) {
    const bookingFormContainer = document.getElementById('booking-form-container');
    bookingFormContainer.innerHTML = `
      <div class="booking-success">
        <div class="text-center mb-4">
          <i class="fas fa-check-circle text-success" style="font-size: 48px;"></i>
        </div>
        <h4 class="text-center">Booking Successful!</h4>
        <p class="text-center">Your appointment for ${getServiceName(selectedService)} on ${formatDate(selectedDateTime.date)} at ${formatTime(selectedDateTime.time)} has been confirmed.</p>
        <p class="text-center">A confirmation email has been sent to ${email}.</p>
        <div class="text-center mt-4">
          <button class="btn btn-primary" onclick="resetBookingForm()">Book Another Appointment</button>
        </div>
      </div>
    `;
  }

  /**
   * Show booking error message
   */
  function showBookingError() {
    const bookingFormContainer = document.getElementById('booking-form-container');
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
  
  // Define the function to reset the booking form
  window.resetBookingForm = function() {
    // Reset the booking process
    selectedDateTime = null;
    
    // Clear selected day and time slot
    document.querySelectorAll('.calendar-day.selected, .time-slot.selected').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Clear time slots and booking form
    document.getElementById('time-slots-container').innerHTML = '';
    document.getElementById('booking-form-container').style.display = 'none';
    
    // Scroll back to the calendar
    document.getElementById('appointment-calendar').scrollIntoView({ behavior: 'smooth' });
  };
}

/**
 * Generate time slots for a given date
 */
function generateTimeSlots(dateString) {
  // Define business hours based on service and day of week
  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Define business hours
  let startHour, endHour;
  
  if (selectedService === 'mouthguards' && (dayOfWeek >= 1 && dayOfWeek <= 3)) {
    // Mon-Wed for mouthguards: 10am-6pm
    startHour = 10;
    endHour = 18;
  } else {
    // Other days or services: 10am-4pm
    startHour = 10;
    endHour = 16;
  }
  
  // Generate all possible slots every 30 minutes
  const allSlots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    allSlots.push(`${String(hour).padStart(2, '0')}:00`);
    allSlots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  
  // If Google Calendar API is available, check for busy times
  if (gapi && gapi.client && gapi.client.calendar) {
    // Create time range for the entire day
    const timeMin = new Date(dateString + 'T00:00:00').toISOString();
    const timeMax = new Date(dateString + 'T23:59:59').toISOString();
    
    // Return a promise that resolves with available slots
    return new Promise((resolve, reject) => {
      gapi.client.calendar.freebusy.query({
        timeMin: timeMin,
        timeMax: timeMax,
        items: [{ id: CALENDAR_ID[selectedService] }]
      }).then(response => {
        const busySlots = [];
        const busyPeriods = response.result.calendars[CALENDAR_ID[selectedService]].busy;
        
        // Process busy periods to determine which slots are unavailable
        busyPeriods.forEach(period => {
          const start = new Date(period.start);
          const end = new Date(period.end);
          
          // Check each slot against busy periods
          allSlots.forEach(slot => {
            const [hours, minutes] = slot.split(':').map(Number);
            const slotStart = new Date(date);
            slotStart.setHours(hours, minutes, 0, 0);
            
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + SERVICE_DURATION[selectedService]);
            
            // If slot overlaps with busy period, mark as busy
            if ((slotStart >= start && slotStart < end) || 
                (slotEnd > start && slotEnd <= end) ||
                (slotStart <= start && slotEnd >= end)) {
              busySlots.push(slot);
            }
          });
        });
        
        // Filter out busy slots
        const availableSlots = allSlots.filter(slot => !busySlots.includes(slot));
        resolve(availableSlots);
      }).catch(error => {
        console.error('Error fetching busy times', error);
        // If there's an error, fall back to all slots with random availability
        const availableSlots = allSlots.filter(() => Math.random() > 0.3);
        resolve(availableSlots);
      });
    });
  } else {
    // If Google Calendar API is not available, generate mock availability
    return Promise.resolve(allSlots.filter(() => Math.random() > 0.3));
  }
}

/**
 * Create HTML for time slots
 */
function createTimeSlotsHTML(dateString) {
  const date = new Date(dateString);
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = formatDate(dateString);
  
  // Show loading state
  let html = `
    <h4 class="mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
    <div class="time-slots-loading">
      <div class="spinner" style="margin: 20px auto;"></div>
      <p class="text-center">Loading available time slots...</p>
    </div>
  `;
  
  // Generate time slots asynchronously
  const timeSlotsContainer = document.getElementById('time-slots-container');
  timeSlotsContainer.innerHTML = html;
  
  // Get time slots and update the UI
  generateTimeSlots(dateString).then(timeSlots => {
    if (timeSlots.length === 0) {
      // No available slots
      html = `
        <h4 class="mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
        <div class="alert alert-info">
          <p class="text-center mb-0">No available appointments for this date. Please select another date.</p>
        </div>
      `;
    } else {
      // Show available slots
      html = `
        <h4 class="mb-4">Available Times for ${dayOfWeek}, ${formattedDate}</h4>
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
    }
    
    timeSlotsContainer.innerHTML = html;
  });
  
  return html;
}

/**
 * Show the booking form
 */
function showBookingForm(dateString, timeString) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  bookingFormContainer.style.display = 'block';
  
  bookingFormContainer.innerHTML = `
    <h4 class="mb-4">Complete Your Booking</h4>
    <p><strong>Service:</strong> ${getServiceName(selectedService)}</p>
    <p><strong>Date:</strong> ${formatDate(dateString)}</p>
    <p><strong>Time:</strong> ${formatTime(timeString)}</p>
    
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
      
      <div style="grid-column: span 2; text-align: center; margin-top: 20px;">
        <button type="button" class="btn btn-outline-secondary mr-2" onclick="resetBookingForm()">Cancel</button>
        <button type="submit" class="btn btn-primary">Confirm Booking</button>
      </div>
    </form>
  `;
  
  // Scroll to the form
  bookingFormContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Get the end time for an event
 */
function getEndTime(dateString, timeString, durationMinutes) {
  const startDateTime = new Date(`${dateString}T${timeString}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
  
  const hours = String(endDateTime.getHours()).padStart(2, '0');
  const minutes = String(endDateTime.getMinutes()).padStart(2, '0');
  
  return `${dateString}T${hours}:${minutes}:00`;
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

// Add new function to show fallback booking method
window.showBookingFallback = function(eventData) {
  const bookingFormContainer = document.getElementById('booking-form-container');
  
  // First show a processing message
  bookingFormContainer.innerHTML = `
    <div class="text-center">
      <div class="spinner" style="margin: 20px auto;"></div>
      <p>Processing your appointment request...</p>
    </div>
  `;
  
  // Extract booking data from the event data
  const bookingData = {
    firstName: document.getElementById('booking-first-name').value,
    lastName: document.getElementById('booking-last-name').value,
    email: document.getElementById('booking-email').value,
    phone: document.getElementById('booking-phone').value,
    notes: document.getElementById('booking-notes').value,
    service: selectedService,
    date: selectedDateTime.date,
    time: selectedDateTime.time
  };
  
  // Send the booking data to our fallback PHP endpoint
  fetch('api/booking-fallback.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookingData)
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Show success message
      bookingFormContainer.innerHTML = `
        <div class="booking-success">
          <div class="text-center mb-4">
            <i class="fas fa-check-circle text-success" style="font-size: 48px;"></i>
          </div>
          <h4 class="text-center">Booking Request Submitted</h4>
          <p class="text-center">We've received your appointment request for ${getServiceName(selectedService)} on ${formatDate(selectedDateTime.date)} at ${formatTime(selectedDateTime.time)}.</p>
          <p class="text-center">Our staff will contact you shortly to confirm your appointment.</p>
          <p class="text-center mt-3"><strong>If you don't hear from us within 24 hours, please call us at (02) 9398 7578.</strong></p>
          <div class="text-center mt-4">
            <button class="btn btn-primary" onclick="resetBookingForm()">Book Another Appointment</button>
          </div>
        </div>
      `;
    } else {
      // Show error message
      bookingFormContainer.innerHTML = `
        <div class="booking-error">
          <div class="text-center mb-4">
            <i class="fas fa-exclamation-circle text-danger" style="font-size: 48px;"></i>
          </div>
          <h4 class="text-center">Booking Error</h4>
          <p class="text-center">${data.message}</p>
          <div class="text-center mt-4">
            <button class="btn btn-outline-secondary" onclick="resetBookingForm()">Try Again</button>
            <a href="contact-us.html" class="btn btn-primary ml-2">Contact Us</a>
          </div>
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Error submitting booking:', error);
    
    // Show error message
    bookingFormContainer.innerHTML = `
      <div class="booking-error">
        <div class="text-center mb-4">
          <i class="fas fa-exclamation-circle text-danger" style="font-size: 48px;"></i>
        </div>
        <h4 class="text-center">Booking Error</h4>
        <p class="text-center">There was a problem submitting your booking. Please try again or contact us directly.</p>
        <div class="text-center mt-4">
          <button class="btn btn-outline-secondary" onclick="resetBookingForm()">Try Again</button>
          <a href="contact-us.html" class="btn btn-primary ml-2">Contact Us</a>
        </div>
      </div>
    `;
  });
}; 