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

$output = array("status" => 0, "activeContexts" => array());

$acontexts = splitContextsByCharacter($contexts, ";");

$contextsClient = new ContextsClient([
    'projectId'     => $projectId,
    'keyFilePath'   => $keyfilePath
]);

try {
    $formattedContext = $contextsClient->sessionName($projectId, $sessionId);

    foreach($acontexts as $c) {
        # Creates a context
        $newContext = new Context();
        $newContext->setLifespanCount(1);
        $parts = splitContextsByCharacter($c, "/");
        $contextPath = "projects/" . $projectId . "/agent/sessions/" . $sessionId . "/contexts/" . $c;
        $newContext->setName($contextPath);
        $output["activeContexts"][] = $contextPath;
        
        # Set the context in the session
        $contextsClient->createContext($formattedContext, $newContext);
    }
    
    $output["status"] = 1;
    
} finally {
    $contextsClient->close();
}

# Return output as JSON
echo json_encode($output);