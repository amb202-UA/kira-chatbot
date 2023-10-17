<?php
require_once 'credentials.php';

$user = $_POST['username'];
$pass = $_POST['password'];

# Check if exists a username with that password
$output = checkAuthentification($user, $pass);

echo json_encode($output);

return;

function checkAuthentification($user, $pass) {
    global $db_server, $db_user, $db_pass, $db_name;
    
    $output = array("status" => 2, "contexts" => "", "chat" => "");

    # Get a connection with the database
    $connection = mysqli_connect($db_server, $db_user, $db_pass, $db_name);

    if($connection) {
        # Prepare database query to prevent SQL injection
        $query = mysqli_prepare($connection, "SELECT * FROM `usuarios` WHERE `user` = ? AND `password` = ?");

        if($query) {
            # Bind parameters (values to be inserted)
            mysqli_stmt_bind_param($query, "ss", $user, $pass);

            # Make query
            mysqli_stmt_execute($query);

            # Save results
            mysqli_stmt_bind_result($query, $user_r, $pass_r, $contexts_r, $chat_r);
            mysqli_stmt_store_result($query);

            if(mysqli_stmt_num_rows($query) > 0) {
                mysqli_stmt_fetch($query);
                $output["status"]   = 1;
                $output["contexts"] = $contexts_r;
                $output["chat"]     = $chat_r;
            }
            else {
                $output["status"]   = 0;
            }

            # Close prepared statement
            mysqli_stmt_close($query);
        }
    }

    return $output;
}