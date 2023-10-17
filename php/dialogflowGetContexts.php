<?php
# Includes the autoloader for libraries installed with composer
require 'vendor/autoload.php';
require_once 'credentials.php';

# Imports the Google Cloud libraries
use Google\Cloud\Dialogflow\V2\Context;
use Google\Cloud\Dialogflow\V2\ContextsClient;

# Get session identifier
$sessionId = $_POST['session'];

$output = array("status" => 0, "contexts" => array());

$contextsClient = new ContextsClient();
try {
    $formattedContext = $contextsClient->sessionName($projectId, $sessionId);

    # Get the contexts of the current session
    $response = $contextsClient->listContexts($formattedContext);

    # Save each context
    foreach($response as $context) {
        $output["contexts"][] = $context->getName();
    }
    
} finally {
    $contextsClient->close();
}

# Return output as JSON
echo json_encode($output);