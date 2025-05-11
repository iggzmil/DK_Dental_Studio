<?php

namespace GuzzleHttp\Psr7;

use Psr\Http\Message\StreamInterface;

/**
 * Static utility class for Guzzle PSR-7 implementation
 * 
 * This is a simplified version for the minimal OAuth implementation.
 */
class Utils
{
    /**
     * Create a new stream based on the input type.
     *
     * @param string|resource|StreamInterface $resource Entity body data
     *
     * @return StreamInterface
     * @throws \InvalidArgumentException if the $resource arg is not valid.
     */
    public static function streamFor($resource = '')
    {
        if (is_string($resource)) {
            return self::createStringStream($resource);
        }

        return new Stream($resource);
    }

    /**
     * Create a stream from a string.
     *
     * @param string $string String content
     *
     * @return StreamInterface
     */
    private static function createStringStream($string)
    {
        $resource = fopen('php://temp', 'r+');
        if ($string !== '') {
            fwrite($resource, $string);
            fseek($resource, 0);
        }

        return new Stream($resource);
    }
} 