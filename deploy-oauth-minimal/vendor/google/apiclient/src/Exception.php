<?php
/*
 * Copyright 2013 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

namespace Google;

/**
 * Extension to the regular Google\Exception that adds extra helper
 * functionality for debugging. All Google API Service exception are
 * thrown using this class.
 */
class Exception extends \Exception
{
  /**
   * Optional list of errors returned in a JSON response body.
   */
  protected $errors = [];

  /**
   * Override default constructor to add ability to set $errors.
   *
   * @param string $message
   * @param int $code
   * @param Exception|null $previous
   * @param array $errors List of errors returned in a JSON response body.
   */
  public function __construct(
      $message,
      $code = 0,
      \Exception $previous = null,
      $errors = []
  ) {
    if (version_compare(PHP_VERSION, '5.3.0') >= 0) {
      parent::__construct($message, $code, $previous);
    } else {
      parent::__construct($message, $code);
    }
    
    $this->errors = $errors;
  }

  /**
   * Get string representation of this error.
   *
   * @return string
   */
  public function __toString()
  {
    $str = $this->getMessage();
    if ($this->errors) {
      $str .= " (Errors: " . json_encode($this->errors) . ")";
    }

    return $str;
  }

  /**
   * Get the list of errors returned in a JSON response body.
   *
   * @return array
   */
  public function getErrors()
  {
    return $this->errors;
  }
} 