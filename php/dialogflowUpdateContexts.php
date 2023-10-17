<?php
# Includes the autoloader for libraries installed with composer
require 'vendor/autoload.php';
require_once 'credentials.php';
require_once 'contextFunctions.php';

# Imports the Google Cloud libraries
use Google\Cloud\Dialogflow\V2\Context;
use Google\Cloud\Dialogflow\V2\ContextsClient;

# Get session identifier
$sessionId = $_POST['session'];

# Save contexts to be updated
$contexts = $_POST['newContexts'];

$output = array("status" => 0);

$acontexts = splitContextsByCharacter($contexts, ";");

$contextsClient = new ContextsClient();
try {
    $formattedContext = $contextsClient->sessionName($projectId, $sessionId);

    foreach($acontexts as $c) {
        # Creates a context
        $uploadContext = new Context();
        $uploadContext->setLifespanCount(1);
        $uploadContext->setName($c);
        
        # Set the context in the session
        $contextsClient->createContext($formattedContext, $uploadContext);
    }
    
    $output["status"] = 1;
    
} finally {
    $contextsClient->close();
}

# Return output as JSON
echo json_encode($output);