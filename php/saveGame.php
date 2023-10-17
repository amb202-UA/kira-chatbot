<?php
require_once 'credentials.php';

$user = $_POST['username'];
$pass = $_POST['password'];
$cont = $_POST['contexts'];
$chat = $_POST['chat'];

$output = array("status" => 0);

# Update user table
$output["status"] = updateUser($user, $pass, $cont, $chat);

echo json_encode($output);

return;

function updateUser($user, $pass, $cont, $chat) {
    global $db_server, $db_user, $db_pass, $db_name;

    # Get a connection with the database
    $connection = mysqli_connect($db_server, $db_user, $db_pass, $db_name);

    if($connection) {
        # Prepare database query to prevent SQL injection
        $query = mysqli_prepare($connection, "UPDATE `usuarios` SET `current_contexts` = ?, `conversation` = ? WHERE `user` = ? AND `password` = ?");

        if($query) {
            # Bind parameters (values to be inserted)
            mysqli_stmt_bind_param($query, "ssss", $cont, $chat, $user, $pass);

            # Make query
            mysqli_stmt_execute($query);

            # Close prepared statement
            mysqli_stmt_close($query);
            
            return 1;
        }
    }
    else {
        return mysqli_connect_error();
    }

    return 0;
}