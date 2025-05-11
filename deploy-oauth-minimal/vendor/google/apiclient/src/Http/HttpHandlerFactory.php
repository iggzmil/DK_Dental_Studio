<?php
/*
 * Copyright 2015 Google Inc.
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

namespace Google\Http;

use GuzzleHttp\ClientInterface;

/**
 * Factory class for implementing HTTP handlers.
 *
 * This is a simplified version for the minimal OAuth implementation.
 */
class HttpHandlerFactory
{
    /**
     * Builds out a handler for the given client.
     *
     * @param ClientInterface $client
     * @return callable
     */
    public static function build(ClientInterface $client)
    {
        return function ($request, $options = []) use ($client) {
            return $client->send($request, $options);
        };
    }
} 