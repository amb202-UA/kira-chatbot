<?php
require_once 'credentials.php';

$userInput = $_POST['text'];

# Check if exists a username with the name sent
$output = checkDatabaseUsername($userInput);

if      ($output === true)  echo("t");
else if ($output === false) echo("f");
else                        echo($output);

return;

function checkDatabaseUsername($username) {
    global $db_server, $db_user, $db_pass, $db_name;
    $response       = false;

    # Get a connection with the database
    $connection = mysqli_connect($db_server, $db_user, $db_pass, $db_name);

    if($connection) {
        # Prepare database query to prevent SQL injection
        $query = mysqli_prepare($connection, "SELECT `user` FROM `usuarios` WHERE `user` = '" . $username . "'");

        if($query) {
            # Make query
            mysqli_stmt_execute($query);

            # Save results
            mysqli_stmt_bind_result($query, $user_r);
            mysqli_stmt_store_result($query);

            if(mysqli_stmt_num_rows($query) > 0) {
                $response = true;
            }
        }
    }
    else {
        return mysqli_connect_error();
    }

    return $response;
}