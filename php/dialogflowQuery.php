<?php
# Includes the autoloader for libraries installed with composer
require 'vendor/autoload.php';
require_once 'credentials.php';
require_once 'interactionsData.php';

# Imports the Google Cloud libraries
use Google\Cloud\Dialogflow\V2\SessionsClient;
use Google\Cloud\Dialogflow\V2\QueryInput;
use Google\Cloud\Dialogflow\V2\TextInput;
use Google\Cloud\Dialogflow\V2\DetectIntentResponse;
use Google\Protobuf\Internal\RepeatedField;
use Google\Cloud\Dialogflow\V2\Context;

# Get session identifier
$sessionId              = $_POST['session'];

# Save user message and current contexts
$userInput              = $_POST['text'];
$userCurrentContexts    = $_POST['ccontexts'];

$output = array("status" => 0, "message" => "", "contexts" => array());

$sessionsClient = new SessionsClient([
    'projectId'     => $projectId,
    'keyFilePath'   => $keyfilePath
]);

try {
    $formattedSession = $sessionsClient->sessionName($projectId, $sessionId);

    # Creates a text input with the message received
    $inputText = new TextInput();
    $inputText->setText($userInput);
    $inputText->setLanguageCode('es');

    # Generates a query with the input created
    $queryInput = new QueryInput();
    $queryInput->setText($inputText);

    # Call the agent with the query
    $response = $sessionsClient->detectIntent($formattedSession, $queryInput);

    # Get the result
    $queryResult = $response->getQueryResult();    
    
    $output["status"]   = 1;

    # Check if needs a database call
    $intentMatched = $queryResult->getIntent()->getDisplayName();
    foreach($dbQueryIntents as $dbIntent) {
        if(strcmp($intentMatched, $dbIntent) == 0) {
            # Get current context
            $queryContexts = getRelevantContext($userCurrentContexts);

            # Make a query to database
            $output["message"]  = getDatabaseQuery($dbIntent, $queryContexts);
        }
    }

    # Save the message
    if(strcmp($output["message"], "") == 0) {
        $output["message"]  = $queryResult->getFulfillmentText();
    }

    # Save contexts
    foreach($queryResult->getOutputContexts() as $context) {
        $output["contexts"][] = $context->getName();
    }
    
} catch (Exception $e) {
    echo 'Excepción capturada: ',  $e->getMessage(), "\n";
}finally {
    $sessionsClient->close();
}

# Return output as JSON
echo json_encode($output);

return;

function getRelevantContext($currentContexts) {
    # List of relevant contexts for database query
    GLOBAL $relevantContexts;
    $c = "";

    # Search if a relevant context is active
    foreach($relevantContexts as $cont) {
        if(strpos($currentContexts, $cont) !== FALSE) {
            if(strlen($c) > 0) $c .= ";";
            $c .= $cont;
        }
    }

    return $c;
}

function getDatabaseQuery($intent, $contexts) {
    global $db_server, $db_user, $db_pass, $db_name;
    $response       = '';

    # Split contexts to make SQL IN statement
    $splitContexts = explode(";", $contexts);
    $queryContexts = "(";
    foreach($splitContexts as $c) {
        if(strlen($queryContexts) > 2) $queryContexts .= ", ";
        $queryContexts .= "'" . $c . "'";
    }
    $queryContexts .= ")";

    # Get a connection with the database
    $connection = mysqli_connect($db_server, $db_user, $db_pass, $db_name);
    mysqli_set_charset($connection, "utf8");

    if($connection) {
        # Prepare database query to prevent SQL injection
        $query = mysqli_prepare($connection, 'SELECT `'. $intent. '` FROM `contextos` WHERE `context` IN '.$queryContexts.' AND `'.$intent.'` IS NOT NULL ORDER BY `importance` DESC');
        
        if($query) {
            # Make query
            mysqli_stmt_execute($query);

            # Save results
            mysqli_stmt_bind_result($query, $message_r);
            mysqli_stmt_store_result($query);

            if(mysqli_stmt_num_rows($query) > 0) {
                mysqli_stmt_fetch($query);
                $response = $message_r;
            }

            # Close prepared statement
            mysqli_stmt_close($query);
        }
    }
    else {
        return mysqli_connect_error();
    }

    return $response;
}

?>