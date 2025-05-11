<?php
/*
 * Copyright 2010 Google Inc.
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

namespace Google\Auth;

use Google\Client;
use Google\Exception as GoogleException;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Psr7;
use GuzzleHttp\Psr7\Request;

/**
 * Authentication class for Google's OAuth2 implementation.
 *
 * This is a simplified version for the minimal OAuth implementation.
 */
class OAuth2 implements GetUniverseDomainInterface
{
    const AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
    const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
    const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
    const DEFAULT_UNIVERSE_DOMAIN = 'googleapis.com';

    private $clientId;
    private $clientSecret;
    private $redirectUri;
    private $state;
    private $accessType = 'online';
    private $approvalPrompt = 'auto';
    private $requestVisibleActions;
    private $loginHint;
    private $prompt;
    private $scopes = [];
    private $code;
    private $includeGrantedScopes = false;
    private $hostedDomain;
    private $openidRealm;
    private $universeDomain = self::DEFAULT_UNIVERSE_DOMAIN;
    private $codeVerifier;

    /**
     * @param ClientInterface $http
     * @param array $token
     * @param string $accessType
     * @return array
     */
    public function fetchAuthToken(ClientInterface $http, array $additionalClaims = [])
    {
        if ($this->code) {
            return $this->fetchAuthTokenWithAuthCode($http);
        }

        // Call the OAuth2 service to get an access token
        $request = $this->generateFetchAuthTokenRequest([]);
        $response = $http->send($request);
        $body = json_decode((string) $response->getBody(), true);

        if ($body === null) {
            throw new GoogleException("Invalid response received from the OAuth2 service");
        }

        return $body;
    }

    private function fetchAuthTokenWithAuthCode(ClientInterface $http)
    {
        $params = [
            'code' => $this->code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $this->redirectUri,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
        ];

        if ($this->codeVerifier) {
            $params['code_verifier'] = $this->codeVerifier;
        }

        $request = new Request(
            'POST',
            self::TOKEN_URL,
            ['Content-Type' => 'application/x-www-form-urlencoded'],
            Psr7\Utils::streamFor(http_build_query($params))
        );

        $response = $http->send($request);
        $body = json_decode((string) $response->getBody(), true);

        if ($body === null) {
            throw new GoogleException("Invalid response received from the OAuth2 service");
        }

        return $body;
    }

    /**
     * @param string $token
     * @return string
     */
    public function revokeToken($token)
    {
        $request = new Request(
            'POST',
            self::REVOKE_URL,
            ['Content-Type' => 'application/x-www-form-urlencoded'],
            Psr7\Utils::streamFor(http_build_query(['token' => $token]))
        );

        return $request;
    }

    /**
     * @return string
     */
    public function buildFullAuthorizationUri(array $config = [])
    {
        if (empty($this->clientId)) {
            // Add detailed debugging information
            $debug = "Client ID is empty. Debug trace: ";
            $debug .= "clientId property: '" . $this->clientId . "'; ";
            $debug .= "scopes: " . json_encode($this->scopes) . "; ";
            $debug .= "redirectUri: " . $this->redirectUri;
            error_log($debug);
            
            // Try to use a more permissive debug directory
            $safeDebugDir = dirname(dirname(dirname(dirname(__DIR__)))) . '/debug';
            if (!file_exists($safeDebugDir)) {
                @mkdir($safeDebugDir, 0777, true);
            }
            
            // Safe debug logging attempt
            @file_put_contents(
                $safeDebugDir . '/oauth_debug.log', 
                date('Y-m-d H:i:s') . ' - ' . $debug . PHP_EOL, 
                FILE_APPEND
            );
            
            throw new GoogleException('Missing Client ID');
        }

        $params = [
            'response_type' => 'code',
            'access_type' => $this->accessType,
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'scope' => implode(' ', $this->scopes),
        ];

        if (isset($this->state)) {
            $params['state'] = $this->state;
        }
        if (isset($this->hostedDomain)) {
            $params['hd'] = $this->hostedDomain;
        }
        if (isset($this->prompt)) {
            $params['prompt'] = $this->prompt;
        }
        if ($this->includeGrantedScopes) {
            $params['include_granted_scopes'] = 'true';
        }
        if (isset($this->loginHint)) {
            $params['login_hint'] = $this->loginHint;
        }
        if (isset($this->requestVisibleActions)) {
            $params['request_visible_actions'] = $this->requestVisibleActions;
        }
        if (isset($this->approvalPrompt)) {
            $params['approval_prompt'] = $this->approvalPrompt;
        }
        if (isset($this->openidRealm)) {
            $params['openid.realm'] = $this->openidRealm;
        }

        return self::AUTH_URL . '?' . http_build_query($params);
    }

    /**
     * Generates a request for token credentials.
     *
     * @param array $authConfig
     * @return Request the authorization request
     */
    private function generateFetchAuthTokenRequest(array $additionalClaims)
    {
        // Provide a default token in case code isn't set
        $postBody = ['grant_type' => 'client_credentials'];
        
        // Override grant_type for refresh token
        if (isset($this->refreshToken)) {
            $postBody['grant_type'] = 'refresh_token';
            $postBody['refresh_token'] = $this->refreshToken;
        }

        $postBody['client_id'] = $this->clientId;
        $postBody['client_secret'] = $this->clientSecret;

        $request = new Request(
            'POST',
            self::TOKEN_URL,
            ['Content-Type' => 'application/x-www-form-urlencoded'],
            Psr7\Utils::streamFor(http_build_query($postBody))
        );

        return $request;
    }

    /**
     * @param string $clientId
     */
    public function setClientId($clientId)
    {
        $this->clientId = $clientId;
    }

    /**
     * @param string $clientSecret
     */
    public function setClientSecret($clientSecret)
    {
        $this->clientSecret = $clientSecret;
    }

    /**
     * @param string $redirectUri
     */
    public function setRedirectUri($redirectUri)
    {
        $this->redirectUri = $redirectUri;
    }

    /**
     * @param string $code
     */
    public function setCode($code)
    {
        $this->code = $code;
    }

    /**
     * @param string $codeVerifier
     */
    public function setCodeVerifier($codeVerifier)
    {
        $this->codeVerifier = $codeVerifier;
    }

    /**
     * @return string
     */
    public function getUniverseDomain()
    {
        return $this->universeDomain;
    }
} 