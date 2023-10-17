<?php
function splitContextsByCharacter($contexts, $char) {
    $acontexts = array();
    $split = true;

    do {
        $pos = strpos($contexts, $char);

        if($pos !== false) {
            # Split the string in two
            if($pos > 0) {
                $addContext = substr($contexts, 0, $pos);

                # Save the context in the array
                array_push($acontexts, $addContext);
            }

            # Update contexts string
            $contexts = substr($contexts, $pos+1);
        }
        else {
            # Save the last context and exit loop
            array_push($acontexts, $contexts);
            $split = false;
        }

    }while($split);

    return $acontexts;
}