// Custom counter formatter to add "+" sign to specific counters
(function($) {
  "use strict";
  
  // Store the original formatter function
  var originalFormatter = $.fn.countTo.Constructor.prototype.options.formatter;
  
  // Override the countTo plugin's formatter for specific elements
  $(document).ready(function() {
    // Apply custom formatter to counters that need a "+" sign
    $('.timer[data-bs-to="500"]').data('formatter', function(value, options) {
      return Math.floor(value).toString() + '+';
    });
    
    // You can add more counters that need "+" signs here
    // For example:
    $('.timer[data-bs-to="1090"]').data('formatter', function(value, options) {
      return Math.floor(value).toString() + '+';
    });
  });
  
})(jQuery);
