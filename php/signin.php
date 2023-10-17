<?php
require_once 'credentials.php';

$user = $_POST['username'];
$pass = $_POST['password'];
$cont = $_POST['contexts'];

# Check if exists a username with the name sent
$output = insertNewUser($user, $pass, $cont);

echo $output;

return;

function insertNewUser($user, $pass, $cont) {
    global $db_server, $db_user, $db_pass, $db_name;

    # Get a connection with the database
    $connection = mysqli_connect($db_server, $db_user, $db_pass, $db_name);

    if($connection) {
        # Prepare database query to prevent SQL injection
        $query = mysqli_prepare($connection, "INSERT INTO `usuarios` (`user`, `password`, `current_contexts`) VALUES (?, ?, ?)");

        if($query) {
            # Bind parameters (values to be inserted)
            mysqli_stmt_bind_param($query, "sss", $user, $pass, $cont);

            # Make query
            mysqli_stmt_execute($query);

            # Close prepared statement
            mysqli_stmt_close($query);
        }
        else {
            return 0;
        }
    }
    else {
        return mysqli_connect_error();
    }

    return 1;
}