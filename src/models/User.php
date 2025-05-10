<?php
/**
 * User Model
 * 
 * Sample model class for user data
 */
class User
{
    private $id;
    private $name;
    private $email;
    
    public function __construct($id = null, $name = null, $email = null)
    {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
    }
    
    // Getters
    public function getId()
    {
        return $this->id;
    }
    
    public function getName()
    {
        return $this->name;
    }
    
    public function getEmail()
    {
        return $this->email;
    }
    
    // Setters
    public function setId($id)
    {
        $this->id = $id;
    }
    
    public function setName($name)
    {
        $this->name = $name;
    }
    
    public function setEmail($email)
    {
        $this->email = $email;
    }
    
    // Sample method to demonstrate IntelliSense
    public function getDisplayName()
    {
        return $this->name . ' (' . $this->email . ')';
    }
}
